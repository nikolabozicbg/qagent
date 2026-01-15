import { TrendingUp, TrendingDown } from 'lucide-react';
import { ReactNode } from 'react';

interface MetricCardProps {
  icon?: ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function MetricCard({ icon, value, label, sublabel, trend, className = '' }: MetricCardProps) {
  return (
    <div className={`glass rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl font-bold">{value}</span>
        {icon && <span className="text-white/40">{icon}</span>}
      </div>
      <p className="text-sm text-white/70 font-medium">{label}</p>
      {(sublabel || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {sublabel && <p className="text-xs text-white/50">{sublabel}</p>}
          {trend && (
            <span className={`text-xs flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-success' : 
              trend.direction === 'down' ? 'text-error' : 
              'text-white/50'
            }`}>
              {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
