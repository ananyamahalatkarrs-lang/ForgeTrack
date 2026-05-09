import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, FileSpreadsheet } from 'lucide-react';

export function RecentActivityCard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        const { data, error } = await supabase
          .from('import_log')
          .select('id, filename, uploaded_at, status')
          .order('uploaded_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Error fetching recent activity:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecentActivity();
  }, []);

  return (
    <div className="bg-surface rounded-[24px] shadow-[var(--shadow-card)] p-8 border border-border-subtle h-full flex flex-col">
      <div className="flex items-center text-label text-tertiary mb-6 uppercase tracking-wider">
        <Activity className="w-3.5 h-3.5 mr-2" />
        RECENT IMPORTS
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center">
              <div className="w-8 h-8 bg-surface-raised rounded-full animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-1/2 bg-surface-raised rounded animate-pulse" />
                <div className="h-2 w-1/3 bg-surface-raised rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="text-body-sm text-tertiary italic h-full flex items-center justify-center">
            No recent activity found.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-secondary shrink-0 border border-border-subtle">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-body-sm text-primary mb-0.5 break-all">
                  {log.filename}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-caption text-tertiary">
                    {new Date(log.uploaded_at).toLocaleString('en-US', { 
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                    })}
                  </p>
                  <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-success' : 'bg-warning'}`} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
