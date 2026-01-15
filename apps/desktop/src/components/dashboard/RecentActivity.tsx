import { CheckCircle2, Sparkles, Search, XCircle, Clock } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'test-passed' | 'test-failed' | 'generated' | 'discovered';
  message: string;
  timestamp: string;
  details?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const ACTIVITY_ICONS = {
  'test-passed': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  'test-failed': { icon: XCircle, color: 'text-error', bg: 'bg-error/10' },
  'generated': { icon: Sparkles, color: 'text-accent', bg: 'bg-accent/10' },
  'discovered': { icon: Search, color: 'text-primary', bg: 'bg-primary/10' },
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
          Recent Activity
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-white/40">
          <Clock className="w-8 h-8 mb-2" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">
        Recent Activity
      </h2>
      
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity) => {
          const { icon: Icon, color, bg } = ACTIVITY_ICONS[activity.type];
          
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90">{activity.message}</p>
                {activity.details && (
                  <p className="text-xs text-white/50 truncate">{activity.details}</p>
                )}
              </div>
              <span className="text-xs text-white/40 flex-shrink-0">
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
