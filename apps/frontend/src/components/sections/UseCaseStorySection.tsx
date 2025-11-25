export default function UseCaseStorySection() {
  return (
    <section>
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden border border-slate-800 bg-slate-900/30 rounded-xl p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5"></div>
          <div className="relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
                <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                <span>YOUR DAILY WORKFLOW</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">Three steps. Done.</h3>
              <p className="text-sm text-slate-400">From feature to full coverage in under a minute</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-400">1</span>
                </div>
                <div className="flex-1 space-y-1 pt-1">
                  <div className="text-base font-semibold">Write your feature</div>
                  <div className="text-sm text-slate-400">Code like you normally do</div>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-400">2</span>
                </div>
                <div className="flex-1 space-y-1 pt-1">
                  <div className="text-base font-semibold">See the gap</div>
                  <div className="text-sm text-slate-400">Badge shows: <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 ml-1">⚠️ 0 tests</span></div>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-emerald-400">3</span>
                </div>
                <div className="flex-1 space-y-1 pt-1">
                  <div className="text-base font-semibold">Right-click, ship</div>
                  <div className="text-sm text-slate-400">12 tests generated. Coverage: <span className="text-emerald-400 font-medium">100%</span></div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                <span>Typical time: <span className="text-emerald-400 font-medium">30 seconds</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
