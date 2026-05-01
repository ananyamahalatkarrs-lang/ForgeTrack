import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar as CalendarIcon, Clock, Monitor } from 'lucide-react';

export function UpcomingSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .gt('date', today)
          .order('date', { ascending: true });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error("Error fetching upcoming sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUpcoming();
  }, []);

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-display-sm text-primary mb-2">Upcoming Sessions</h1>
        <p className="text-secondary text-body-sm">View the schedule for future classes.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-[var(--shadow-card)]">
          <div className="w-16 h-16 rounded-full bg-surface-inset flex items-center justify-center mx-auto mb-4 border border-border-default">
            <CalendarIcon className="w-8 h-8 text-tertiary" />
          </div>
          <h2 className="text-h2 text-primary mb-2">No Upcoming Classes</h2>
          <p className="text-secondary text-body-sm">There are no future sessions scheduled at the moment.</p>
        </div>
      ) : (
        <div className="relative border-l border-border-subtle ml-4 space-y-8 pb-8">
          {sessions.map((session, i) => {
            const date = new Date(session.date);
            const isNext = i === 0;

            return (
              <div key={session.id} className="relative pl-8 group">
                {/* Timeline Dot */}
                <div className={`absolute -left-2.5 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-void
                  ${isNext ? 'border-accent-glow' : 'border-border-default'}`}
                >
                  {isNext && <div className="w-2 h-2 rounded-full bg-accent-glow shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                </div>

                <div className={`bg-surface rounded-2xl border p-6 transition-colors duration-300
                  ${isNext ? 'border-accent-glow shadow-[0_0_24px_rgba(99,102,241,0.05)]' : 'border-border-subtle shadow-[var(--shadow-card)] hover:border-border-default'}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <span className="text-micro font-mono text-tertiary uppercase tracking-wider bg-surface-inset px-2.5 py-1 rounded border border-border-subtle">
                      {date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {isNext && (
                      <span className="text-[12px] font-medium text-accent-glow bg-[rgba(99,102,241,0.1)] px-2.5 py-1 rounded-full border border-[rgba(99,102,241,0.2)]">
                        Up Next
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-display-xs text-primary mb-4">{session.topic}</h3>
                  
                  <div className="flex items-center gap-6 text-body-sm text-secondary">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-tertiary" />
                      <span>{session.duration_hours} Hours</span>
                    </div>
                    <div className="flex items-center capitalize">
                      <Monitor className="w-4 h-4 mr-2 text-tertiary" />
                      <span>{session.session_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
