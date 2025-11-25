export function Skeleton({ className = "", variant = "text" }: { className?: string; variant?: "text" | "circular" | "rectangular" }) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-muted/50 via-muted to-muted/50 bg-[length:200%_100%]";
  
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-md"
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, shimmer 2s linear infinite"
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
    </div>
  );
}
