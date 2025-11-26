"use client";

import { MessageSquare, Zap, Wrench, Grid3x3, RefreshCcw, Target } from "lucide-react";

export default function WhyQAgenAISection() {
  return (
    <section className="section-padding relative overflow-hidden">
      {/* Premium layered background with stronger depth */}
      <div className="absolute inset-0 bg-[#0a0a0f] -z-50"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-40"></div>
      <div className="absolute top-0 right-0 w-[700px] h-[600px] bg-purple-500/20 blur-[120px] -z-30"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[500px] bg-pink-500/15 blur-[100px] -z-30"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 -z-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent -z-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20 space-y-6">
          <div className="badge-purple">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
            <span>The only test tool you'll ever need</span>
          </div>
          
          <h2 className="heading-2">
            <span className="text-gradient-purple text-gradient-animated">Why QAgenAI wins</span>
          </h2>
          
          <p className="body-large text-slate-400 max-w-2xl mx-auto">
            Simpler, faster, and more powerful than 3-agent orchestrators
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[200px]">
          
          {/* Large: Chat Interface - 2x2 */}
          <div className="card-premium md:col-span-3 md:row-span-2 p-10 group relative overflow-hidden">
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="icon-box-md gradient-purple glow-purple-sm group-hover:scale-110">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Natural Chat Interface</h3>
                  <span className="badge-modern text-xs mt-1">vs. 3-step agents</span>
                </div>
              </div>
              
              <p className="body-base text-slate-400 mb-4">
                Talk to AI like a teammate. No complex agent orchestration or multi-step workflows.
              </p>

              {/* Mock chat UI with premium styling */}
              <div className="flex-1 space-y-2 mt-auto">
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-slate-700/40 shadow-depth-1 hover:border-slate-600/60 transition-all">
                  <p className="text-sm text-slate-300 font-medium">"Generate tests for UserService"</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/15 to-pink-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/40 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <p className="text-sm text-purple-200 font-medium">✓ 12 tests generated in 8 seconds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Medium: Instant Generation */}
          <div className="card-premium md:col-span-3 p-8 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="icon-box-sm gradient-emerald">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Instant Generation</h3>
                <span className="badge-modern text-xs">10x faster</span>
              </div>
            </div>
            <p className="body-small text-slate-400">
              Right-click → Tests ready. Skip the planning phase, get results in seconds.
            </p>
          </div>

          {/* Medium: 15+ Frameworks */}
          <div className="card-premium md:col-span-3 p-8 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="icon-box-sm gradient-cyan">
                <Grid3x3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">15+ Frameworks</h3>
                <span className="badge-modern text-xs">universal</span>
              </div>
            </div>
            <p className="body-small text-slate-400 mb-3">
              Jest, Vitest, Pytest, Playwright, Mocha—all in one tool.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Jest', 'Vitest', 'Pytest', 'Mocha', '+11'].map((fw, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-slate-800/60 backdrop-blur-sm rounded-lg text-slate-300 border border-slate-700/40 hover:border-blue-500/40 hover:bg-slate-800/80 hover:text-white transition-all cursor-default">
                  {fw}
                </span>
              ))}
            </div>
          </div>

          {/* Small: Right-click shortcut */}
          <div className="card-premium md:col-span-2 p-8 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">One-Click</h3>
                <span className="badge-modern text-xs">seamless</span>
              </div>
              <p className="body-small text-slate-400 text-sm">
                Right-click shortcut. No context switching.
              </p>
            </div>
          </div>

          {/* Small: Auto self-healing */}
          <div className="card-premium md:col-span-2 p-8 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/25 animate-morph">
                <RefreshCcw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Self-Healing</h3>
                <span className="badge-modern text-xs">automatic</span>
              </div>
              <p className="body-small text-slate-400 text-sm">
                Tests update themselves. Zero maintenance.
              </p>
            </div>
          </div>

          {/* Small: Real-time coverage */}
          <div className="card-premium md:col-span-2 p-8 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Live Coverage</h3>
                <span className="badge-modern text-xs">real-time</span>
              </div>
              <p className="body-small text-slate-400 text-sm">
                See gaps as you type. Proactive detection.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom tagline */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 text-sm">
            <span className="text-slate-500">No complex workflows</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">No agent orchestration</span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400 font-semibold">Just works</span>
          </div>
        </div>
      </div>
    </section>
  );
}
