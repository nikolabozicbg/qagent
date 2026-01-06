export const StatusBar = () => {
  return (
    <div className="h-statusbar bg-surface border-t border-white/5 flex items-center justify-between px-4 text-xs">
      {/* Left: Activity indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success rounded-full" />
          <span className="text-white/60">Ready</span>
        </div>
      </div>

      {/* Right: Shortcuts hint */}
      <div className="flex items-center gap-4 text-white/40">
        <span>Press ⌘K for commands</span>
      </div>
    </div>
  );
};
