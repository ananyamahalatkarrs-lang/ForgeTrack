import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, UserCircle, CheckCircle2, XCircle } from 'lucide-react';

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
      const { data } = await supabase
        .from('students')
        .select('id, usn, name, is_active')
        .order('usn');
      if (data) setStudents(data);
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
          .eq('student_id', selectedStudent.id)
          .order('sessions(date)', { ascending: false });

        if (error) throw error;
        
        // Data returns array of objects with nested session
        // Let's flatten and sort properly
        const formatted = (data || [])
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

  // Filter for search
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-display-sm text-primary mb-2">Student History</h1>
        <p className="text-secondary text-body-sm">View detailed attendance profiles for individual students.</p>
      </div>

      {/* Combobox / Search */}
      <div className="mb-8 relative max-w-md z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input 
            type="text" 
            placeholder="Search by Name or USN..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedStudent && e.target.value !== selectedStudent.name) {
                setSelectedStudent(null); // clear selection if typing
              }
            }}
            className="w-full bg-surface-inset border border-border-default rounded-md pl-10 pr-4 py-3 text-primary text-[14px] focus:border-accent-glow focus:outline-none placeholder:text-tertiary shadow-[var(--shadow-card)]"
          />
        </div>
        
        {searchTerm && !selectedStudent && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-subtle rounded-md shadow-raised max-h-60 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-tertiary text-sm text-center">No students found.</div>
            ) : (
              filteredStudents.map(student => (
                <div 
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setSearchTerm(student.name);
                  }}
                  className="px-4 py-3 hover:bg-surface-raised cursor-pointer border-b border-border-subtle last:border-0 flex justify-between items-center"
                >
                  <div>
                    <p className="text-primary text-sm font-medium">{student.name}</p>
                    <p className="text-tertiary text-xs font-mono">{student.usn}</p>
                  </div>
                  {!student.is_active && (
                    <span className="text-[10px] bg-danger-bg text-danger-fg px-2 py-0.5 rounded uppercase font-semibold">Dropped</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Profile Card */}
            <div className="lg:col-span-1 bg-surface rounded-[24px] border border-border-subtle p-8 shadow-[var(--shadow-card)] flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center text-primary mb-4 border border-border-default">
                <UserCircle className="w-10 h-10 text-secondary" strokeWidth={1} />
              </div>
              <h2 className="text-h2 text-primary mb-1">{selectedStudent.name}</h2>
              <p className="text-body-sm font-mono text-tertiary mb-6">{selectedStudent.usn}</p>
              
              <div className={`w-full p-4 rounded-xl border flex flex-col items-center justify-center ${
                stats.pct >= 75 ? 'bg-success-bg border-success-border text-success' :
                stats.pct >= 50 ? 'bg-warning-bg border-warning-border text-warning' :
                'bg-danger-bg border-danger-border text-danger-fg'
              }`}>
                <p className="text-display-md leading-none mb-1">{stats.pct}%</p>
                <p className="text-caption font-medium uppercase tracking-wider opacity-80">Overall Attendance</p>
              </div>
            </div>

            {/* Heatmap Card */}
            <div className="lg:col-span-2 bg-surface rounded-[24px] border border-border-subtle p-8 shadow-[var(--shadow-card)]">
              <h3 className="text-h3 text-primary mb-6">Attendance Heatmap</h3>
              
              {loading ? (
                <div className="h-40 bg-surface-inset rounded animate-pulse" />
              ) : historyData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-tertiary italic text-sm">
                  No attendance records found.
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between">
                  {/* CSS Grid Heatmap (simplified timeline wrap) */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {/* Render chronological order for heatmap */}
                    {[...historyData].reverse().map((session, i) => (
                      <div 
                        key={i} 
                        title={`${new Date(session.date).toLocaleDateString()} - ${session.topic}`}
                        className={`w-6 h-6 rounded-sm border ${
                          session.present 
                            ? 'bg-success border-success text-white' 
                            : 'bg-surface-inset border-danger-border'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-6 text-caption text-secondary border-t border-border-subtle pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-success border border-success" />
                      <span>Present ({stats.present})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-surface-inset border border-danger-border" />
                      <span>Absent ({stats.total - stats.present})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-surface rounded-[24px] border border-border-subtle shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle bg-surface-raised">
              <h3 className="text-body font-medium text-primary">Session Breakdown</h3>
            </div>
            
            {loading ? (
              <div className="p-8 space-y-4">
                <div className="h-10 w-full bg-surface-inset rounded animate-pulse" />
                <div className="h-10 w-full bg-surface-inset rounded animate-pulse" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-inset border-b border-border-subtle">
                    <tr>
                      <th className="px-6 py-3 text-label text-secondary font-medium">DATE</th>
                      <th className="px-6 py-3 text-label text-secondary font-medium">TOPIC</th>
                      <th className="px-6 py-3 text-label text-secondary font-medium">TYPE</th>
                      <th className="px-6 py-3 text-label text-secondary font-medium">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {historyData.map(session => (
                      <tr key={session.id} className="hover:bg-surface-inset transition-colors">
                        <td className="px-6 py-4 text-body-sm text-secondary font-mono">
                          {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-body-sm text-primary font-medium">{session.topic}</td>
                        <td className="px-6 py-4 text-body-sm text-tertiary capitalize">{session.session_type}</td>
                        <td className="px-6 py-4">
                          {session.present ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-bg text-success border border-success-border text-[12px] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-bg text-danger-fg border border-danger-border text-[12px] font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {historyData.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-tertiary text-body-sm italic">
                          No session history available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
