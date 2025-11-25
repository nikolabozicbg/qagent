import { Search, Zap, RefreshCw } from "lucide-react";

export default function CoreValuesSection() {
  return (
    <section>
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-7 card-depth stagger-1 gpu-accelerated hover:border-purple-500/40 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative space-y-4">
            <div className="relative w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/15 transition-all duration-300">
              <div className="absolute inset-0 rounded-xl bg-purple-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Search className="relative w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[17px] font-semibold tracking-tight">Finds gaps</h3>
              <p className="text-[13px] text-slate-400 leading-[1.6]">Real-time coverage analysis shows untested code and missing edge cases as you type</p>
            </div>
            <div className="pt-3 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Avg detection time</span>
                <span className="font-mono text-purple-400 font-semibold tabular-nums">&lt;100ms</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-7 card-depth stagger-2 gpu-accelerated hover:border-emerald-500/40 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative space-y-4">
            <div className="relative w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/15 transition-all duration-300">
              <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Zap className="relative w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[17px] font-semibold tracking-tight">Generates instantly</h3>
              <p className="text-[13px] text-slate-400 leading-[1.6]">Complete test suites in seconds. Unit, E2E, integration, API — all 15+ frameworks supported</p>
            </div>
            <div className="pt-3 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Typical suite size</span>
                <span className="font-mono text-emerald-400 font-semibold tabular-nums">10-15 tests</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-7 card-depth stagger-3 gpu-accelerated hover:border-pink-500/40 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,114,182,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative space-y-4">
            <div className="relative w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-180 group-hover:bg-pink-500/15 transition-all duration-500">
              <div className="absolute inset-0 rounded-xl bg-pink-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <RefreshCw className="relative w-5 h-5 text-pink-400 group-hover:text-pink-300 transition-colors" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[17px] font-semibold tracking-tight">Self-healing</h3>
              <p className="text-[13px] text-slate-400 leading-[1.6]">Refactor fearlessly. Tests auto-update when code changes. Zero maintenance required.</p>
            </div>
            <div className="pt-3 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Healing accuracy</span>
                <span className="font-mono text-pink-400 font-semibold tabular-nums">98%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
