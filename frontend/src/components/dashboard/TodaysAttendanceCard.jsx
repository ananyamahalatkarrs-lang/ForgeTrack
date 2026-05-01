import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserCheck } from 'lucide-react';

export function TodaysAttendanceCard() {
  const [stats, setStats] = useState({ present: 0, total: 0, absentStudents: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Find today's session
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id')
          .eq('date', today)
          .single();

        if (!sessionData) {
          setLoading(false);
          return;
        }

        // Fetch attendance for this session with student details
        const { data: attendanceData, error } = await supabase
          .from('attendance')
          .select(`
            present,
            students (
              name,
              usn
            )
          `)
          .eq('session_id', sessionData.id);

        if (error) throw error;

        if (attendanceData) {
          const presentCount = attendanceData.filter(a => a.present).length;
          const totalCount = attendanceData.length;
          const absent = attendanceData
            .filter(a => !a.present)
            .map(a => a.students.name)
            .slice(0, 5); // Show up to 5 absent students

          setStats({
            present: presentCount,
            total: totalCount,
            absentStudents: absent
          });
        }
      } catch (err) {
        console.error("Error fetching today's attendance:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="bg-surface rounded-[24px] shadow-[var(--shadow-card)] p-10 border border-border-subtle h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center text-label text-tertiary mb-6 uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5 mr-2" />
          TODAY'S ATTENDANCE
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-10 w-24 bg-surface-raised rounded animate-pulse" />
            <div className="h-2 w-full bg-surface-raised rounded animate-pulse" />
          </div>
        ) : stats.total === 0 ? (
          <div className="text-body-sm text-tertiary italic">
            Attendance has not been marked for today.
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-display-md text-primary leading-none">{pct}%</span>
              <span className="text-body-sm text-secondary mb-1">
                ({stats.present}/{stats.total} Present)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-surface-inset rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-success transition-all duration-1000 ease-out" 
                style={{ width: `${pct}%` }} 
              />
            </div>

            {/* Absent List */}
            {stats.absentStudents.length > 0 && (
              <div>
                <p className="text-micro text-tertiary mb-2">ABSENT TODAY</p>
                <div className="flex flex-wrap gap-2">
                  {stats.absentStudents.map((name, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-1 rounded bg-danger-bg text-danger-fg text-[12px] font-medium border border-danger-border"
                    >
                      {name}
                    </span>
                  ))}
                  {stats.total - stats.present > 5 && (
                    <span className="px-2 py-1 rounded bg-surface-inset text-tertiary text-[12px] font-medium border border-border-subtle">
                      + {stats.total - stats.present - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {stats.total > 0 && stats.total === stats.present && (
              <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-success-bg text-success border border-success-border text-sm font-medium mt-2">
                100% Attendance Today! 🎉
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
