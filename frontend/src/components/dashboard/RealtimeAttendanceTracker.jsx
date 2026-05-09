import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

export function RealtimeAttendanceTracker() {
  const { user, userProfile, role } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [todaySessionId, setTodaySessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  // Stats calculation
  const stats = Object.values(attendance).reduce((acc, status) => {
    acc[status]++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Fetch Students
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name, usn')
          .eq('is_active', true)
          .order('name');
        
        setStudents(studentsData || []);
        
        // Fetch Today's Session
        const today = new Date().toLocaleDateString('en-CA');
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id')
          .eq('date', today)
          .single();

        let existingAtt = {};
        if (sessionData) {
          setTodaySessionId(sessionData.id);
          const { data: attData } = await supabase
            .from('attendance')
            .select('student_id, present')
            .eq('session_id', sessionData.id);
          
          if (attData) {
            attData.forEach(a => existingAtt[a.student_id] = a.present ? 'present' : 'absent');
          }
        }

        // Initialize local state (Default all to absent)
        const initialState = {};
        studentsData?.forEach(s => initialState[s.id] = existingAtt[s.id] || 'absent');
        setAttendance(initialState);

        // 2. Setup Realtime Channel
        // We use 'broadcast' to sync state between users without needing a database row for every click
        const channel = supabase.channel('attendance_live', {
          config: { broadcast: { self: true } }
        });

        channel
          .on('broadcast', { event: 'attendance_update' }, ({ payload }) => {
            setAttendance(prev => ({
              ...prev,
              [payload.studentId]: payload.status
            }));
          })
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        console.error("Failed to initialize tracker:", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const updateStatus = async (studentId, status) => {
    if (!user || role !== 'mentor') return;

    // Update local state IMMEDIATELY for a snappy, interactive feel
    setAttendance(prev => ({ ...prev, [studentId]: status }));

    // Update Database if there's a session today
    if (todaySessionId) {
      try {
        await supabase
          .from('attendance')
          .upsert({
            session_id: todaySessionId,
            student_id: studentId,
            present: status === 'present',
            recorded_by: user.id
          }, { onConflict: 'session_id, student_id' });
      } catch (err) {
        console.error('Failed to save attendance', err);
      }
    }

    // Attempt to broadcast to other users
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'attendance_update',
        payload: { 
          studentId, 
          status,
          mentorId: user.id,
          mentorName: userProfile?.display_name || 'Mentor'
        }
      });
    } catch (e) {
      // Ignore errors if realtime is not available
    }
  };

  if (loading) return <div className="h-64 bg-surface rounded-3xl animate-pulse border border-border-subtle" />;

  return (
    <div className="bg-surface rounded-[32px] shadow-[var(--shadow-card)] border border-border-subtle overflow-hidden flex flex-col h-[500px]">
      {/* Header with Stats */}
      <div className="p-6 bg-surface-raised border-b border-border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-glow/10 flex items-center justify-center text-accent-glow">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-h3 text-primary">Live Session Tracker</h3>
            <p className="text-caption text-tertiary">Broadcasting to all mentors</p>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <StatBadge color="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />} count={stats.present} label="Present" />
          <StatBadge color="warning" icon={<Clock className="w-3.5 h-3.5" />} count={stats.late} label="Late" />
          <StatBadge color="danger" icon={<XCircle className="w-3.5 h-3.5" />} count={stats.absent} label="Absent" />
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-2">
          {students.map(student => (
            <div 
              key={student.id}
              className="group flex items-center justify-between p-4 rounded-2xl hover:bg-surface-inset transition-all border border-transparent hover:border-border-subtle"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-secondary font-bold text-xs border border-border-subtle group-hover:border-accent-glow transition-colors">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-body-sm font-medium text-primary leading-tight">{student.name}</h4>
                  <p className="text-micro text-tertiary font-mono uppercase tracking-tighter">{student.usn}</p>
                </div>
              </div>

              <div className="flex bg-surface-inset p-1 rounded-xl border border-border-default">
                <ToggleButton 
                  active={attendance[student.id] === 'present'} 
                  onClick={() => updateStatus(student.id, 'present')}
                  color="success"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  tooltip="Present"
                />
                <ToggleButton 
                  active={attendance[student.id] === 'late'} 
                  onClick={() => updateStatus(student.id, 'late')}
                  color="warning"
                  icon={<Clock className="w-4 h-4" />}
                  tooltip="Late"
                />
                <ToggleButton 
                  active={attendance[student.id] === 'absent'} 
                  onClick={() => updateStatus(student.id, 'absent')}
                  color="danger"
                  icon={<XCircle className="w-4 h-4" />}
                  tooltip="Absent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBadge({ color, icon, count, label }) {
  const colors = {
    success: "text-success bg-success/5 border-success/10",
    warning: "text-warning bg-warning/5 border-warning/10",
    danger: "text-danger-fg bg-danger-bg border-danger-border"
  };
  return (
    <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${colors[color]}`}>
      {icon}
      <span className="text-body-sm font-bold leading-none">{count}</span>
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 hidden md:inline">{label}</span>
    </div>
  );
}

function ToggleButton({ active, onClick, color, icon, tooltip }) {
  const activeStyles = {
    success: "bg-success text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    warning: "bg-warning text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    danger: "bg-danger-fg text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
  };
  
  return (
    <button 
      onClick={onClick}
      title={tooltip}
      className={`p-2.5 rounded-lg transition-all duration-300 transform active:scale-90 ${active ? activeStyles[color] : 'text-tertiary hover:text-secondary hover:bg-surface-raised'}`}
    >
      {icon}
    </button>
  );
}
