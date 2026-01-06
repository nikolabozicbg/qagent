interface PriorityBadgeProps {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const getColors = () => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-error/20 text-error';
      case 'HIGH':
        return 'bg-warning/20 text-warning';
      case 'MEDIUM':
        return 'bg-accent/20 text-accent';
      case 'LOW':
        return 'bg-success/20 text-success';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'md':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-3 py-1.5';
    }
  };

  return (
    <span className={`font-medium rounded ${getColors()} ${getSizeClasses()}`}>
      {priority}
    </span>
  );
}
