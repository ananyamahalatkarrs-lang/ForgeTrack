import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Monitor } from 'lucide-react';

export function TodaysSessionCard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSession() {
      try {
        const today = new Date().toLocaleDateString('en-CA');
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('date', today)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching today's session:", error);
        }
        
        if (data) {
          setSession(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, []);

  return (
    <div className="bg-surface bg-[image:var(--card-gradient)] rounded-[24px] shadow-[var(--shadow-card)] p-10 border border-border-subtle h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center text-label text-tertiary mb-2 uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 mr-2" />
          TODAY'S SESSION
        </div>
        
        {loading ? (
          <div className="space-y-3 mt-4">
            <div className="h-8 w-3/4 bg-surface-raised rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-surface-raised rounded animate-pulse" />
          </div>
        ) : session ? (
          <>
            <h2 className="text-display-sm text-primary mb-4 leading-tight">
              {session.topic}
            </h2>
            <div className="flex items-center gap-4 text-body-sm text-secondary">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5" />
                {session.duration_hours} Hours
              </span>
              <span className="flex items-center capitalize">
                <Monitor className="w-4 h-4 mr-1.5" />
                {session.session_type}
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-h2 text-secondary mb-4 font-normal italic">
              No session scheduled for today
            </h2>
            <p className="text-body-sm text-tertiary mb-6">
              You can create a session directly when marking attendance.
            </p>
            <button 
              onClick={() => navigate('/attendance')}
              className="bg-primary text-inverse rounded-md px-5 py-3 font-medium text-[14px] hover:bg-[#E5E5E7] transition-colors inline-block w-fit"
            >
              Create Session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
