import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Calendar as CalendarIcon, CheckSquare, AlertTriangle, Save } from 'lucide-react';

export function MarkAttendance() {
  const { user, role } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [originalState, setOriginalState] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [newSessionData, setNewSessionData] = useState({ topic: '', session_type: 'online', duration_hours: 2 });
  const [creatingSession, setCreatingSession] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Constants for Date Picker
  const MIN_DATE = '2025-08-04';
  const MAX_DATE = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDataForDate(selectedDate);
  }, [selectedDate]);

  async function fetchDataForDate(date) {
    setLoading(true);
    setSession(null);
    setAttendanceState({});
    setOriginalState({});
    try {
      // 1. Check if session exists
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', date)
        .single();

      if (sessionData) {
        setSession(sessionData);
        // 2. Fetch all active students
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, usn, name')
          .eq('is_active', true)
          .order('usn');
        
        setStudents(studentsData || []);

        // 3. Fetch existing attendance
        const { data: attData } = await supabase
          .from('attendance')
          .select('student_id, present')
          .eq('session_id', sessionData.id);

        const stateMap = {};
        if (attData) {
          attData.forEach(a => {
            stateMap[a.student_id] = a.present;
          });
        }
        // Default missing to false
        studentsData?.forEach(s => {
          if (stateMap[s.id] === undefined) stateMap[s.id] = false;
        });

        setAttendanceState(stateMap);
        setOriginalState({ ...stateMap });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setCreatingSession(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          date: selectedDate,
          topic: newSessionData.topic,
          session_type: newSessionData.session_type,
          duration_hours: Number(newSessionData.duration_hours)
        })
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      fetchDataForDate(selectedDate); // re-fetch to load students
    } catch (err) {
      console.error(err);
      alert("Failed to create session.");
    } finally {
      setCreatingSession(false);
    }
  };

  const handleToggle = (studentId) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSaveClick = () => {
    // Check if we are overwriting existing data
    const isOverwriting = Object.keys(originalState).some(id => originalState[id] !== undefined);
    if (isOverwriting) {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!user || role !== 'mentor') {
      alert("Unauthorized: Only mentors can save attendance.");
      return;
    }

    setSaving(true);
    setShowConfirmModal(false);
    try {
      const upsertData = students.map(s => ({
        session_id: session.id,
        student_id: s.id,
        present: attendanceState[s.id],
        recorded_by: user.id
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(upsertData, { onConflict: 'session_id, student_id' });

      if (error) throw error;
      
      setOriginalState({ ...attendanceState });
      alert("Attendance saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-display-sm text-primary mb-2">Mark Attendance</h1>
          <p className="text-secondary text-body-sm">Select a date and record student presence.</p>
        </div>

        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input 
            type="date" 
            min={MIN_DATE}
            max={MAX_DATE}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-surface-inset border border-border-default rounded-md pl-10 pr-4 py-2 text-primary text-[14px] focus:border-accent-glow focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-surface rounded-2xl animate-pulse" />
      ) : !session ? (
        <div className="bg-surface border border-border-subtle rounded-2xl p-8 shadow-[var(--shadow-card)]">
          <h2 className="text-h2 mb-2">No Session Found</h2>
          <p className="text-secondary text-body-sm mb-6">
            There is no session scheduled for {new Date(selectedDate).toLocaleDateString()}. You must create one before marking attendance.
          </p>
          
          <form onSubmit={handleCreateSession} className="space-y-4 max-w-md">
            <div>
              <label className="block text-label text-secondary mb-1">TOPIC</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Introduction to React"
                value={newSessionData.topic}
                onChange={e => setNewSessionData({...newSessionData, topic: e.target.value})}
                className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-label text-secondary mb-1">TYPE</label>
                <select 
                  value={newSessionData.session_type}
                  onChange={e => setNewSessionData({...newSessionData, session_type: e.target.value})}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none appearance-none"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-label text-secondary mb-1">DURATION (HRS)</label>
                <input 
                  required
                  type="number" 
                  min="1" max="8"
                  value={newSessionData.duration_hours}
                  onChange={e => setNewSessionData({...newSessionData, duration_hours: e.target.value})}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-4 py-2 text-primary focus:border-accent-glow focus:outline-none"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={creatingSession}
              className="bg-primary text-inverse px-5 py-2.5 rounded-md font-medium text-[14px] hover:bg-[#E5E5E7] transition-colors mt-2"
            >
              {creatingSession ? 'Creating...' : 'Create Session'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-surface border border-border-subtle rounded-2xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col h-[calc(100vh-220px)]">
          <div className="p-6 border-b border-border-subtle bg-surface-raised flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-h2 text-primary">{session.topic}</h2>
              <p className="text-caption text-tertiary capitalize mt-1">
                {session.session_type} • {session.duration_hours} Hrs
              </p>
            </div>
            <button 
              onClick={handleSaveClick}
              disabled={saving}
              className="bg-accent-glow text-white px-5 py-2.5 rounded-md font-medium text-[14px] hover:bg-opacity-90 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-raised border-b border-border-subtle z-10">
                <tr>
                  <th className="px-6 py-3 text-label text-secondary font-medium w-16">STATUS</th>
                  <th className="px-6 py-3 text-label text-secondary font-medium w-32">USN</th>
                  <th className="px-6 py-3 text-label text-secondary font-medium">NAME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {students.map(student => {
                  const isPresent = attendanceState[student.id];
                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-surface-inset transition-colors cursor-pointer ${isPresent ? 'bg-[rgba(16,185,129,0.02)]' : ''}`}
                      onClick={() => handleToggle(student.id)}
                    >
                      <td className="px-6 py-4">
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isPresent ? 'bg-success border-success text-white' : 'border-tertiary bg-transparent text-transparent'}`}>
                          <CheckSquare className="w-4 h-4" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-secondary font-mono">{student.usn}</td>
                      <td className="px-6 py-4 text-body-sm font-medium text-primary">{student.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-border-subtle shadow-raised animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-warning-bg flex items-center justify-center text-warning mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-h2 mb-2">Overwrite Data?</h3>
            <p className="text-body-sm text-secondary mb-6">
              Attendance records already exist for this session. Saving will overwrite the previous entries. Do you want to proceed?
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-md border border-border-default text-primary hover:bg-surface-raised transition-colors text-[14px] font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={executeSave}
                className="px-4 py-2 rounded-md bg-warning text-white hover:bg-opacity-90 transition-colors text-[14px] font-medium"
              >
                Yes, Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
