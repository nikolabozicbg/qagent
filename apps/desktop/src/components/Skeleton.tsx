interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  animation = 'pulse' 
}: SkeletonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
    }
  };

  const getAnimationClass = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'wave':
        return 'animate-shimmer';
      case 'none':
        return '';
    }
  };

  return (
    <div 
      className={`bg-white/5 ${getVariantClass()} ${getAnimationClass()} ${className}`}
    />
  );
}

// Pre-built skeleton components
export function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonFlowCard() {
  return (
    <div className="glass rounded-xl p-6 border border-white/10">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton variant="circular" className="w-5 h-5" />
          <Skeleton className="h-6 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton variant="circular" className="w-4 h-4" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-20 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFlowCard key={i} />
      ))}
    </div>
  );
}
