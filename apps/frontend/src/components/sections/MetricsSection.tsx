export default function MetricsSection() {
  return (
    <section>
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-900/80 p-12 lg:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(168,85,247,0.08),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)]"></div>
          <div className="relative">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></div>
                <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">By The Numbers</div>
              </div>
              <h2 className="text-[32px] font-bold tracking-tight mb-2">Why developers choose QAgenAI</h2>
              <p className="text-[13px] text-slate-500">Real impact, measured</p>
            </div>
            <div className="grid md:grid-cols-3 gap-16">
              <div className="group text-center space-y-4 cursor-default">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-400/20 blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                  <div className="relative text-[80px] font-bold leading-none tracking-[-0.03em]">
                    <span className="bg-gradient-to-br from-emerald-400 via-emerald-400 to-emerald-600 bg-clip-text text-transparent group-hover:from-emerald-300 group-hover:via-emerald-400 group-hover:to-emerald-500 transition-all duration-500">10×</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[15px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Faster generation</div>
                  <div className="text-[12px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">From hours to minutes<br/>vs manual writing</div>
                </div>
              </div>
              
              <div className="group text-center space-y-4 cursor-default">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-purple-400/20 blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                  <div className="relative text-[80px] font-bold leading-none tracking-[-0.03em]">
                    <span className="bg-gradient-to-br from-purple-400 via-purple-400 to-purple-600 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:via-purple-400 group-hover:to-purple-500 transition-all duration-500">100%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[15px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Full coverage</div>
                  <div className="text-[12px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">Unit, integration, E2E<br/>all test types</div>
                </div>
              </div>
              
              <div className="group text-center space-y-4 cursor-default">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-pink-400/20 blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                  <div className="relative text-[80px] font-bold leading-none tracking-[-0.03em]">
                    <span className="bg-gradient-to-br from-pink-400 via-pink-400 to-pink-600 bg-clip-text text-transparent group-hover:from-pink-300 group-hover:via-pink-400 group-hover:to-pink-500 transition-all duration-500">0h</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[15px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Test maintenance</div>
                  <div className="text-[12px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">Self-healing tests<br/>adapt automatically</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
