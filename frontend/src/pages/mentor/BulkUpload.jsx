import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { analyzeSheetStructure } from '../../lib/gemini';
import { useAuth } from '../../hooks/useAuth';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Table, 
  Layers, 
  Calendar, 
  ArrowRight,
  Info
} from 'lucide-react';

export function BulkUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [step, setStep] = useState('upload'); // upload, select_sheets, analyze, review, progress, success
  
  const [analysis, setAnalysis] = useState(null);
  const [sampleData, setSampleData] = useState([]);
  const [inferenceData, setInferenceData] = useState({ startDate: '', classDays: ['Mon', 'Wed', 'Fri'] });
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setStep('select_sheets');
    };
    reader.readAsBinaryString(f);
  };

  const toggleSheet = (name) => {
    setSelectedSheets(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const startAnalysis = async () => {
    if (selectedSheets.length === 0) return;
    setStep('analyze');
    setLoading(true);
    
    try {
      const sheet = workbook.Sheets[selectedSheets[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (!rawData || rawData.length === 0) {
        throw new Error("The selected sheet appears to be empty.");
      }

      // 1. Find Header Row (Look for rows containing common keywords)
      const keywords = ['name', 'usn', 'email', 'attendance', 'date', 'sl no'];
      let headerIdx = rawData.findIndex(row => 
        row && Array.isArray(row) && row.some(cell => 
          typeof cell === 'string' && keywords.some(k => cell.toLowerCase().includes(k))
        )
      );
      
      if (headerIdx === -1) headerIdx = 0;
      
      const headers = rawData[headerIdx];
      // Include the row ABOVE the headers in case of merged labels (e.g. "Day 1")
      const contextHeaders = headerIdx > 0 ? rawData[headerIdx - 1] : null;
      const sampleRows = rawData.slice(headerIdx + 1, headerIdx + 6); // More samples for better AI reasoning
      
      let aiResponse;
      try {
        aiResponse = await analyzeSheetStructure(
          { headers, context: contextHeaders }, 
          sampleRows
        );
        setAnalysis({ ...aiResponse, headerIdx });
        
        // Store first 4 rows for preview
        const dataRows = rawData.slice(headerIdx + 1, headerIdx + 5).filter(r => r.length > 0);
        setSampleData(dataRows);
      } catch (aiErr) {
        console.error("AI mapping error:", aiErr);
        setError("AI mapping failed: " + (aiErr.message || aiErr.toString()));
        setStep('select_sheets');
        setLoading(false);
        return;
      }

      // Log raw AI response for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log('AI Response:', aiResponse);
      }

      try {
        const datesToCheck = aiResponse.mappings.attendance_indices
          .map(a => a.date)
          .filter(d => d !== null);

        if (datesToCheck.length > 0) {
          const { data: existingSessions, error: sessionErr } = await supabase
            .from('sessions')
            .select('date, topic')
            .in('date', datesToCheck);
          if (sessionErr) {
            throw sessionErr;
          }
          if (existingSessions?.length > 0) {
            setDuplicateWarnings(existingSessions);
          }
        }
        setStep('review');
      } catch (dbErr) {
        console.error("Supabase fetch error:", dbErr);
        setError("Supabase fetch failed: " + (dbErr.message || dbErr.toString()));
        setStep('select_sheets');
      }
    } catch (err) {
      console.error("General error:", err);
      setError((err && err.message) ? err.message : "Unknown error during analysis. Please try again.");
      setStep('select_sheets');
    } finally {
      setLoading(false);
    }
  };

  const [importedStudents, setImportedStudents] = useState([]);

  const processUpload = async () => {
    setStep('progress');
    setLoading(true);
    setError(null);
    const newImportedNames = [];
    
    try {
      // 0. FIRST DELETE ALL EXISTING STUDENTS (Fresh Start as requested)
      setProgress({ current: 0, total: 100, label: 'Clearing existing students...' });
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .filter('id', 'gt', 0); // Delete all students
      
      if (deleteError) {
        console.error("Delete Error:", deleteError);
        throw new Error("Failed to clear existing students: " + deleteError.message);
      }

      for (const sheetName of selectedSheets) {
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const { mappings, headerIdx } = analysis;
        
        const rows = rawData.slice(headerIdx + 1).filter(r => r.length > 0);
        const totalRows = rows.length;
        
        setProgress({ current: 0, total: totalRows, label: `Processing ${sheetName}...` });

        // 1. Prepare Dates for the sessions
        let sessions = [];
        if (analysis.needs_date_inference) {
          // Infer dates based on start date and class days
          let currentDate = new Date(inferenceData.startDate);
          const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
          const targetDays = inferenceData.classDays.map(d => dayMap[d]);

          mappings.attendance_indices.forEach((att, i) => {
            while (!targetDays.includes(currentDate.getDay())) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
            sessions.push({ 
              idx: att.index, 
              date: currentDate.toISOString().split('T')[0],
              label: att.label 
            });
            currentDate.setDate(currentDate.getDate() + 1); // Move to next day for next session
          });
        } else {
          sessions = mappings.attendance_indices.map(att => ({
            idx: att.index,
            date: att.date,
            label: att.label
          }));
        }

        // 2. Create Sessions in DB
        const createdSessions = [];
        for (const s of sessions) {
          const { data, error } = await supabase
            .from('sessions')
            .upsert({ 
              date: s.date, 
              topic: s.label || `Session ${s.date}`,
              session_type: 'offline',
              duration_hours: 2,
              month_number: new Date(s.date).getMonth() + 1
            }, { onConflict: 'date' })
            .select()
            .single();
          
          if (!error) createdSessions.push({ ...s, dbId: data.id });
        }

        // 3. Process Students and Attendance
        const batchSize = 10;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            // Robust extraction of student info
            const name = row[mappings.student_name_idx]?.toString()?.trim();
            const usn = row[mappings.student_usn_idx]?.toString()?.trim();
            const email = row[mappings.student_email_idx]?.toString()?.trim();
            const branch = row[mappings.student_branch_idx]?.toString()?.trim() || 'CS';

            if (!name || !usn) {
              console.warn("Skipping row due to missing name or USN:", row);
              continue;
            }

            // Insert Student (Using insert because we already deleted all students)
            let studentData;
            try {
              const { data, error: stuErr } = await supabase
                .from('students')
                .insert({ 
                  name, 
                  email: email || `${usn.toLowerCase()}@forgetrack.app`, 
                  usn,
                  branch_code: branch,
                  is_active: true
                })
                .select()
                .single();
              
              if (stuErr) throw stuErr;
              studentData = data;
              newImportedNames.push(name);
            } catch (stuErr) {
              console.error("Student insert error:", stuErr, row);
              continue;
            }

            // Prepare Attendance for this student
            const attendanceRecords = createdSessions.map(s => ({
              session_id: s.dbId,
              student_id: studentData.id,
              present: !!row[s.idx],
              marked_by: 'system'
            }));

            try {
              const { error: attErr } = await supabase
                .from('attendance')
                .upsert(attendanceRecords, { onConflict: 'session_id, student_id' });
              if (attErr) throw attErr;
            } catch (attErr) {
              console.error("Attendance upsert error:", attErr, row);
              continue;
            }
          }

          setProgress(prev => ({ ...prev, current: Math.min(i + batchSize, totalRows) }));
        }
      }
      setImportedStudents(newImportedNames);
      setStep('success');
    } catch (err) {
      console.error("Upload Error:", err);
      setError("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="text-display-sm text-primary mb-3">Bulk Attendance Upload</h1>
        <p className="text-secondary max-w-xl mx-auto">
          Upload spreadsheets from any source. Our AI will automatically map the columns, detect sessions, and handle attendance tracking.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-4">
          {[
            { id: 'upload', icon: FileUp },
            { id: 'select_sheets', icon: Layers },
            { id: 'review', icon: Table },
            { id: 'success', icon: CheckCircle2 }
          ].map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id || (step === 'analyze' && s.id === 'select_sheets') || (step === 'progress' && s.id === 'review');
            const isCompleted = ['select_sheets', 'analyze', 'review', 'progress', 'success'].indexOf(step) > i;
            
            return (
              <div key={s.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-success text-white' : 
                  isActive ? 'bg-primary text-inverse ring-4 ring-primary/10' : 
                  'bg-surface-inset text-tertiary border border-border-default'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                {i < 3 && <div className={`w-12 h-[1px] mx-2 ${isCompleted ? 'bg-success' : 'bg-border-subtle'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[var(--shadow-raised)] p-8 min-h-[400px] flex flex-col">
        
        {step === 'upload' && (
          <div 
            className="flex-1 border-2 border-dashed border-border-default rounded-2xl flex flex-col items-center justify-center p-12 hover:border-primary/50 hover:bg-surface-inset transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileChange} 
            />
            <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center mb-6 text-tertiary">
              <FileUp className="w-8 h-8" />
            </div>
            <h3 className="text-h3 text-primary mb-2">Drop your spreadsheet here</h3>
            <p className="text-body-sm text-tertiary text-center mb-8">
              Supports .xlsx, .xls, and .csv files.<br/>Multiple sheets will be detected automatically.
            </p>
            <button className="bg-primary text-inverse px-6 py-3 rounded-xl font-medium hover:scale-[1.02] transition-transform">
              Browse Files
            </button>
          </div>
        )}

        {step === 'select_sheets' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="w-5 h-5 text-secondary" />
              <h3 className="text-h3 text-primary">Select Sheets to Import</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {sheetNames.map(name => (
                <div 
                  key={name}
                  onClick={() => toggleSheet(name)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedSheets.includes(name) 
                      ? 'bg-primary/5 border-primary ring-1 ring-primary' 
                      : 'bg-surface-inset border-border-default hover:border-border-hover'
                  }`}
                >
                  <span className="font-medium text-primary truncate pr-4">{name}</span>
                  {selectedSheets.includes(name) && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6 flex justify-end">
              <button 
                onClick={startAnalysis}
                disabled={selectedSheets.length === 0}
                className="bg-primary text-inverse px-8 py-3 rounded-xl font-medium hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center"
              >
                Continue to Mapping <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {(step === 'analyze' || (step === 'progress' && loading)) && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h3 className="text-h3 text-primary mb-2">
              {step === 'analyze' ? 'AI is analyzing your sheet...' : progress.label}
            </h3>
            <p className="text-body-sm text-tertiary text-center">
              {step === 'analyze' 
                ? 'Mapping columns and identifying attendance patterns.' 
                : `${progress.current} of ${progress.total} rows processed`}
            </p>
            {step === 'progress' && (
              <div className="w-full max-w-md mt-8">
                <div className="h-2 w-full bg-surface-inset rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'review' && analysis && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Table className="w-5 h-5 text-secondary" />
                <h3 className="text-h3 text-primary">Verify AI Mapping</h3>
              </div>
              <div className="flex items-center gap-2 text-success bg-success/5 px-3 py-1 rounded-full border border-success/20">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-micro font-bold uppercase tracking-wider">
                  AI Confidence: {Math.round(analysis.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Mapping Summary with Data Preview */}
              <div className="p-6 rounded-2xl bg-surface-inset border border-border-default">
                <h4 className="font-semibold text-primary mb-4 flex items-center justify-between">
                  <span>Data Preview</span>
                  <span className="text-body-sm text-secondary font-normal">{analysis.mappings.attendance_indices.length} Sessions Detected</span>
                </h4>
                
                <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface">
                  <table className="w-full text-left">
                    <thead className="bg-surface-raised border-b border-border-subtle">
                      <tr>
                        <th className="px-4 py-3 text-micro text-tertiary font-bold uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-micro text-tertiary font-bold uppercase tracking-wider">USN</th>
                        <th className="px-4 py-3 text-micro text-tertiary font-bold uppercase tracking-wider">Branch</th>
                        <th className="px-4 py-3 text-micro text-tertiary font-bold uppercase tracking-wider">Email (if any)</th>
                        <th className="px-4 py-3 text-micro text-tertiary font-bold uppercase tracking-wider text-right">Sample Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {sampleData.map((row, i) => (
                        <tr key={i} className="hover:bg-surface-inset transition-colors">
                          <td className="px-4 py-3 text-body-sm font-medium text-primary">{row[analysis.mappings.student_name_idx] || '—'}</td>
                          <td className="px-4 py-3 text-body-sm text-secondary font-mono">{row[analysis.mappings.student_usn_idx] || '—'}</td>
                          <td className="px-4 py-3 text-body-sm text-secondary uppercase">{row[analysis.mappings.student_branch_idx] || '—'}</td>
                          <td className="px-4 py-3 text-body-sm text-secondary">{row[analysis.mappings.student_email_idx] || '—'}</td>
                          <td className="px-4 py-3 text-body-sm text-secondary text-right">
                            {analysis.mappings.attendance_indices.slice(0, 3).map(att => (
                              <span key={att.index} title={att.label} className={`inline-block w-4 h-4 rounded-full ml-1 border ${row[att.index] ? 'bg-success border-success' : 'border-border-default bg-surface-raised'}`} />
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate Warnings */}
              {duplicateWarnings.length > 0 && (
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0" />
                  <div>
                    <p className="text-body-sm font-semibold text-warning-fg mb-1">Potential Duplicates Detected</p>
                    <p className="text-caption text-warning-fg/80">
                      Attendance for some of these dates ({duplicateWarnings.map(d => d.date).join(', ')}) already exists. 
                      Uploading will update existing records.
                    </p>
                  </div>
                </div>
              )}

              {/* Date Inference Settings */}
              {analysis.needs_date_inference && (
                <div className="p-6 rounded-2xl border border-accent-glow bg-accent-glow/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-accent-glow" />
                    <h4 className="font-semibold text-primary">Inferred Dates Required</h4>
                  </div>
                  <p className="text-body-sm text-secondary mb-6">
                    The AI detected generic headers (like "Day 1"). Please specify when these classes took place.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-label text-tertiary mb-1.5">START DATE</label>
                      <input 
                        type="date"
                        value={inferenceData.startDate}
                        onChange={e => setInferenceData({...inferenceData, startDate: e.target.value})}
                        className="w-full bg-surface border border-border-default rounded-xl px-4 py-3 text-primary focus:border-accent-glow focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-label text-tertiary mb-1.5">CLASS DAYS</label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <button
                            key={day}
                            onClick={() => {
                              setInferenceData(prev => ({
                                ...prev,
                                classDays: prev.classDays.includes(day) 
                                  ? prev.classDays.filter(d => d !== day)
                                  : [...prev.classDays, day]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-caption font-bold border transition-all ${
                              inferenceData.classDays.includes(day)
                                ? 'bg-primary text-inverse border-primary'
                                : 'bg-surface border-border-default text-tertiary hover:border-border-hover'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-10 flex items-center justify-between">
              <button 
                onClick={() => setStep('select_sheets')}
                className="text-secondary hover:text-primary transition-colors flex items-center font-medium"
              >
                Go Back
              </button>
              <button 
                onClick={processUpload}
                disabled={analysis.needs_date_inference && !inferenceData.startDate}
                className="bg-accent-glow text-white px-10 py-3.5 rounded-xl font-bold shadow-raised hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Confirm & Sync to Database
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-display-sm text-primary mb-2">Sync Complete!</h3>
            <p className="text-body-sm text-secondary mb-6">
              {importedStudents.length} students have been successfully imported and matched.
            </p>

            {/* Imported Students List */}
            <div className="w-full max-w-md mb-8">
              <div className="bg-surface-inset rounded-2xl border border-border-subtle p-4">
                <p className="text-micro font-bold text-tertiary uppercase tracking-widest mb-3 text-left">Imported Students</p>
                <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-2">
                    {importedStudents.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-surface rounded-lg border border-border-subtle text-left">
                        <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-body-sm font-medium text-primary">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="bg-primary text-inverse px-8 py-3 rounded-xl font-medium hover:scale-105 transition-transform"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => setStep('upload')}
                className="bg-surface-raised border border-border-default px-8 py-3 rounded-xl font-medium text-primary hover:bg-surface transition-colors"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-danger-bg border border-danger-border flex gap-3 text-danger-fg">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-body-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
