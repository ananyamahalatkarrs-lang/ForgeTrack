import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

export function ProgramOverviewCard() {
  const [stats, setStats] = useState({
    avgAttendance: 0,
    highestSession: { date: '—', pct: 0 },
    lowestSession: { date: '—', pct: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAggregates() {
      try {
        const { data: attendanceData, error } = await supabase
          .from('attendance')
          .select('session_id, present, sessions(date)');

        if (error) throw error;

        if (attendanceData && attendanceData.length > 0) {
          const sessionMap = {};
          
          // Aggregate by session
          attendanceData.forEach(record => {
            const sid = record.session_id;
            const date = record.sessions?.date;
            if (!sessionMap[sid]) {
              sessionMap[sid] = { date, total: 0, present: 0 };
            }
            sessionMap[sid].total += 1;
            if (record.present) sessionMap[sid].present += 1;
          });

          let highest = { pct: -1, date: '' };
          let lowest = { pct: 101, date: '' };
          let totalPresent = 0;
          let totalRecords = 0;

          Object.values(sessionMap).forEach(s => {
            const pct = (s.present / s.total) * 100;
            totalPresent += s.present;
            totalRecords += s.total;

            if (pct > highest.pct) highest = { pct, date: s.date };
            if (pct < lowest.pct) lowest = { pct, date: s.date };
          });

          const avg = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

          setStats({
            avgAttendance: Math.round(avg),
            highestSession: {
              date: highest.date ? new Date(highest.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—',
              pct: Math.round(highest.pct)
            },
            lowestSession: {
              date: lowest.date ? new Date(lowest.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—',
              pct: Math.round(lowest.pct === 101 ? 0 : lowest.pct)
            }
          });
        }
      } catch (err) {
        console.error("Error fetching overview stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAggregates();
  }, []);

  return (
    <div className="bg-surface rounded-[24px] shadow-[var(--shadow-card)] p-8 border border-border-subtle h-full">
      <div className="flex items-center text-label text-tertiary mb-6 uppercase tracking-wider">
        <BarChart3 className="w-3.5 h-3.5 mr-2" />
        PROGRAM OVERVIEW
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="h-4 w-full bg-surface-raised rounded animate-pulse" />
          <div className="h-4 w-full bg-surface-raised rounded animate-pulse" />
          <div className="h-4 w-full bg-surface-raised rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          
          <div>
            <p className="text-caption text-tertiary mb-1">AVERAGE ATTENDANCE</p>
            <div className="flex items-center gap-2">
              <span className="text-display-sm text-primary">{stats.avgAttendance}%</span>
              <span className="px-2 py-0.5 bg-surface-inset text-secondary text-[12px] rounded border border-border-default">
                Total
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-success-bg flex items-center justify-center mr-3 text-success">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-body-sm font-medium text-primary">Highest Attendance</p>
                  <p className="text-caption text-tertiary">{stats.highestSession.date}</p>
                </div>
              </div>
              <span className="text-body-lg font-semibold text-success">{stats.highestSession.pct}%</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-danger-bg flex items-center justify-center mr-3 text-danger-fg">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-body-sm font-medium text-primary">Lowest Attendance</p>
                  <p className="text-caption text-tertiary">{stats.lowestSession.date}</p>
                </div>
              </div>
              <span className="text-body-lg font-semibold text-danger-fg">{stats.lowestSession.pct}%</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
