import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, UserCircle, CheckCircle2, XCircle, TrendingUp, Calendar, Hash } from 'lucide-react';

export function StudentHistory() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [historyData, setHistoryData] = useState([]);
  const [stats, setStats] = useState({ present: 0, total: 0, pct: 0 });
  const [loading, setLoading] = useState(false);

  // Fetch student list on mount
  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data } = await supabase
          .from('students')
          .select('id, usn, name, is_active')
          .order('name');
        
        setStudents(data || []);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    }
    fetchStudents();
  }, []);

  // Fetch history when a student is selected
  useEffect(() => {
    if (!selectedStudent) return;
    
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            present,
            sessions (
              id,
              date,
              topic,
              session_type
            )
          `)
          .eq('student_id', selectedStudent.id);

        if (error) throw error;
        
        let formatted = (data || [])
          .map(row => ({
            ...row.sessions,
            present: row.present
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));



        setHistoryData(formatted);

        const total = formatted.length;
        const present = formatted.filter(r => r.present).length;
        setStats({
          total,
          present,
          pct: total > 0 ? Math.round((present / total) * 100) : 0
        });

      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [selectedStudent]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-700 space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-glow/10 text-accent-glow text-micro font-bold mb-3 border border-accent-glow/20">
            <TrendingUp className="w-3 h-3" /> ATTENDANCE PORTAL
          </div>
          <h1 className="text-display-sm text-primary tracking-tight">Student Trace</h1>
          <p className="text-secondary text-body-sm mt-1 max-w-md">Search and analyze individual performance with real-time metrics.</p>
        </div>

        {/* Search Input - Glassmorphism */}
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-0 bg-accent-glow/10 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input 
            type="text" 
            placeholder="Search by student name or USN..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedStudent && e.target.value !== selectedStudent.name) setSelectedStudent(null);
            }}
            className="w-full bg-surface/40 backdrop-blur-xl border border-border-default/50 rounded-2xl pl-11 pr-4 py-4 text-primary text-[14px] focus:border-accent-glow focus:outline-none transition-all shadow-[var(--shadow-card)]"
          />
          
          {searchTerm && !selectedStudent && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-surface/80 backdrop-blur-2xl border border-border-subtle/50 rounded-[24px] shadow-raised max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-2">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-tertiary text-sm italic">No matches found.</div>
                ) : (
                  filteredStudents.map(student => (
                    <button 
                      key={student.id}
                      onClick={() => { setSelectedStudent(student); setSearchTerm(student.name); }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex justify-between items-center group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10 group-hover:border-accent-glow">
                          <UserCircle className="w-5 h-5 text-tertiary group-hover:text-accent-glow" />
                        </div>
                        <div>
                          <p className="text-primary text-sm font-semibold leading-tight">{student.name}</p>
                          <p className="text-tertiary text-xs font-mono uppercase tracking-tighter mt-0.5">{student.usn}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Glass Card: Profile & Progress */}
          <div className="lg:col-span-1 bg-surface/30 backdrop-blur-md border border-white/10 rounded-[32px] p-8 shadow-card flex flex-col items-center">
            {/* Circular Progress Bar */}
            <div className="relative w-48 h-48 mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="96" cy="96" r="80" 
                  stroke="currentColor" strokeWidth="12" fill="transparent"
                  className="text-white/5"
                />
                <circle 
                  cx="96" cy="96" r="80" 
                  stroke="currentColor" strokeWidth="12" fill="transparent"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - stats.pct / 100)}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${
                    stats.pct >= 75 ? 'text-success' : stats.pct >= 50 ? 'text-warning' : 'text-danger-fg'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-display-md font-bold text-primary leading-none">{stats.pct}%</span>
                <span className="text-caption text-tertiary uppercase font-bold tracking-widest mt-1">Presence</span>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-h2 text-primary">{selectedStudent.name}</h2>
              <p className="text-body-sm font-mono text-tertiary uppercase mt-1 tracking-widest">{selectedStudent.usn}</p>
            </div>

            {/* Status Breakdown Grid */}
            <div className="w-full grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                <p className="text-h3 text-success leading-none">{stats.present}</p>
                <p className="text-[10px] text-tertiary font-bold uppercase mt-1">Present</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                <p className="text-h3 text-warning leading-none">{historyData.filter(h => h.session_type === 'online' && h.present).length}</p>
                <p className="text-[10px] text-tertiary font-bold uppercase mt-1">Online</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                <p className="text-h3 text-danger-fg leading-none">{stats.total - stats.present}</p>
                <p className="text-[10px] text-tertiary font-bold uppercase mt-1">Absent</p>
              </div>
            </div>
          </div>

          {/* Detailed Timeline Table */}
          <div className="lg:col-span-2 bg-surface/30 backdrop-blur-md border border-white/10 rounded-[32px] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-h3 text-primary">Session Trace</h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <div className="w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <div className="w-2 h-2 rounded-full bg-danger-fg shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="text-micro text-tertiary uppercase tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-4 py-4 font-bold">Session Date</th>
                    <th className="px-4 py-4 font-bold">Subject / Topic</th>
                    <th className="px-4 py-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyData.map((session, idx) => (
                    <tr key={idx} className="group hover:bg-white/5 transition-colors">
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-tertiary">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <span className="text-body-sm text-secondary font-mono">
                            {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-body-sm text-primary font-medium">{session.topic}</td>
                      <td className="px-4 py-5 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                          session.present 
                            ? 'bg-success/10 text-success border-success/20 group-hover:bg-success/20' 
                            : 'bg-danger-fg/10 text-danger-fg border-danger-fg/20 group-hover:bg-danger-fg/20'
                        }`}>
                          {session.present ? 'VERIFIED' : 'MISSED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic Empty State */
        <div className="h-[450px] flex flex-col items-center justify-center text-center bg-surface/20 backdrop-blur-md border border-dashed border-white/10 rounded-[40px] animate-in fade-in duration-1000">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-tertiary mb-6 border border-white/10 shadow-lg animate-bounce duration-[3000ms]">
            <Search className="w-10 h-10 opacity-30" />
          </div>
          <h3 className="text-h3 text-primary tracking-tight">Tracing Ready</h3>
          <p className="text-secondary text-body-sm mt-2 max-w-xs px-6">Input a student USN or name to visualize their real-time performance metrics.</p>
        </div>
      )}
    </div>
  );
}
