"use client";

import { MessageSquare, Zap, Grid3x3, MousePointerClick, RefreshCcw, Target } from "lucide-react";

export default function ValuePropositionSection() {
  const features = [
    {
      icon: MessageSquare,
      title: "Natural Chat Interface",
      description: "Talk to AI like a teammate. No complex workflows or multi-step processes.",
      gradient: "from-purple-500 to-purple-600",
      glow: "shadow-purple-500/25"
    },
    {
      icon: Zap,
      title: "Instant Generation",
      description: "Complete test suites in seconds. Right-click → tests ready. That's it.",
      gradient: "from-emerald-500 to-emerald-600",
      glow: "shadow-emerald-500/25"
    },
    {
      icon: Grid3x3,
      title: "15+ Frameworks",
      description: "Jest, Vitest, Pytest, Playwright, Mocha, Cypress, JUnit and more.",
      gradient: "from-cyan-500 to-cyan-600",
      glow: "shadow-cyan-500/25"
    },
    {
      icon: MousePointerClick,
      title: "One-Click Workflow",
      description: "Right-click in your editor. No context switching. No separate tools.",
      gradient: "from-orange-500 to-orange-600",
      glow: "shadow-orange-500/25"
    },
    {
      icon: RefreshCcw,
      title: "Self-Healing Tests",
      description: "Auto-update when you refactor. Zero maintenance. Just works.",
      gradient: "from-pink-500 to-pink-600",
      glow: "shadow-pink-500/25"
    },
    {
      icon: Target,
      title: "Live Coverage",
      description: "Real-time gap detection as you type. Proactive, not reactive.",
      gradient: "from-blue-500 to-blue-600",
      glow: "shadow-blue-500/25"
    }
  ];

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Premium layered background */}
      <div className="absolute inset-0 bg-[#0a0a0f] -z-50"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-40"></div>
      <div className="absolute top-1/3 left-1/3 w-[700px] h-[700px] bg-purple-500/20 rounded-full blur-[120px] -z-30"></div>
      <div className="absolute bottom-1/3 right-1/3 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[100px] -z-30"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 -z-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent -z-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20 space-y-6">
          <div className="badge-purple">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
            <span>Why teams choose us</span>
          </div>
          
          <h2 className="heading-2">
            <span className="text-gradient-purple text-gradient-animated">Built for speed.</span>
            <br />
            <span className="text-white">Designed for developers.</span>
          </h2>
          
          <p className="body-large max-w-2xl mx-auto">
            Everything you need to ship quality software faster. Nothing you don't.
          </p>
        </div>

        {/* Modern Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[200px]">
          
          {/* Large: Chat Interface - 2x2 */}
          <div className="card-premium md:col-span-3 md:row-span-2 p-10 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative h-full flex flex-col">
              <div className="icon-box-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/25 mb-6 group-hover:scale-110">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Natural Chat Interface</h3>
              <p className="body-base mb-4">Talk to AI like a teammate. No complex workflows or multi-step processes. Just chat.</p>
              <div className="mt-auto pt-4 border-t border-white/5">
                <div className="text-sm text-purple-400 font-semibold">→ 10x simpler workflow</div>
              </div>
            </div>
          </div>

          {/* Medium: Instant Generation */}
          <div className="card-premium md:col-span-3 p-8 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative space-y-4">
              <div className="icon-box-md bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25 group-hover:scale-110">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Instant Generation</h3>
                <p className="body-small">Right-click → tests ready in seconds. Skip the planning phase.</p>
              </div>
            </div>
          </div>

          {/* Medium: 15+ Frameworks */}
          <div className="card-premium md:col-span-3 p-8 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative space-y-4">
              <div className="icon-box-md bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/25 group-hover:scale-110">
                <Grid3x3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">15+ Frameworks</h3>
                <p className="body-small mb-3">Jest, Vitest, Pytest, Playwright, Mocha, Cypress, JUnit...</p>
                <div className="flex flex-wrap gap-2">
                  {['Jest', 'Vitest', 'Pytest', 'Mocha', '+11'].map((fw, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-slate-800/60 backdrop-blur-sm rounded-lg text-slate-300 border border-slate-700/40 hover:border-cyan-500/40 transition-all">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Small: One-Click */}
          <div className="card-premium md:col-span-2 p-8 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative space-y-3">
              <div className="icon-box-sm bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/25 group-hover:scale-110">
                <MousePointerClick className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-2">One-Click</h3>
                <p className="text-sm text-slate-400">Right-click. That's it.</p>
              </div>
            </div>
          </div>

          {/* Small: Self-Healing */}
          <div className="card-premium md:col-span-2 p-8 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative space-y-3">
              <div className="icon-box-sm bg-gradient-to-br from-pink-500 to-pink-600 shadow-pink-500/25 group-hover:scale-110 animate-morph">
                <RefreshCcw className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-2">Self-Healing</h3>
                <p className="text-sm text-slate-400">Auto-update. Zero maintenance.</p>
              </div>
            </div>
          </div>

          {/* Small: Live Coverage */}
          <div className="card-premium md:col-span-2 p-8 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative space-y-3">
              <div className="icon-box-sm bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25 group-hover:scale-110">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-2">Live Coverage</h3>
                <p className="text-sm text-slate-400">Real-time gap detection.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-gradient-purple text-gradient-animated mb-2">10×</div>
            <div className="text-sm text-slate-400">Faster generation</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gradient-purple text-gradient-animated mb-2">15+</div>
            <div className="text-sm text-slate-400">Frameworks supported</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gradient-purple text-gradient-animated mb-2">0h</div>
            <div className="text-sm text-slate-400">Maintenance time</div>
          </div>
        </div>
      </div>
    </section>
  );
}
