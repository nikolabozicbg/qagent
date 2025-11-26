"use client";

import { Code2, Plug, ArrowRight } from "lucide-react";

export default function ChooseYourWaySection() {
  return (
    <section className="section-padding relative overflow-hidden">
      {/* Premium layered background with stronger glows */}
      <div className="absolute inset-0 bg-[#0a0a0f] -z-50"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-40"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/20 blur-[120px] -z-30"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-cyan-500/15 blur-[100px] -z-30"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 -z-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent -z-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20 space-y-6">
          <div className="badge-purple">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
            <span className="text-purple-300">Two ways to ship faster</span>
          </div>
          
          <h2 className="heading-2">
            <span className="text-white">Built for </span>
            <span className="text-gradient-purple text-gradient-animated">your workflow</span>
          </h2>
          
          <p className="body-large text-slate-400 max-w-2xl mx-auto">
            Same powerful AI. Different interfaces. Choose what fits your team.
          </p>
        </div>

        {/* Split Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* VS Code Extension */}
          <div className="group relative">
            <div className="card-premium p-10 hover:border-purple-500/30 h-full flex flex-col">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              
              <div className="relative space-y-6 flex-1 flex flex-col">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between">
                  <div className="icon-box-lg gradient-purple glow-purple-sm group-hover:scale-110">
                    <Code2 className="w-7 h-7 text-white" />
                  </div>
                  <span className="badge-modern text-xs bg-purple-500/10 border-purple-500/30 text-purple-300">
                    Most popular
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    VS Code Extension
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Your AI testing sidekick
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Right-click any file → tests generated</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Chat sidebar for iterating on tests</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Real-time coverage gap detection</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Tests appear in your workspace instantly</p>
                  </div>
                </div>

                {/* CTA */}
                <button className="btn-brutal w-full py-3 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 group/btn mt-6">
                  <span>Join Waitlist</span>
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <p className="text-xs text-center text-slate-500">Q1 2026 • Free beta</p>
              </div>
            </div>
          </div>

          {/* MCP Server */}
          <div className="group relative">
            <div className="card-premium p-10 hover:border-cyan-500/30 h-full flex flex-col">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              
              <div className="relative space-y-6 flex-1 flex flex-col">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between">
                  <div className="icon-box-lg gradient-cyan group-hover:scale-110">
                    <Plug className="w-7 h-7 text-white" />
                  </div>
                  <span className="badge-modern text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-300">
                    Universal
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    MCP Server
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Works with ANY editor
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Use in Claude Desktop, Cursor, Windsurf</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Editor-agnostic - bring your own IDE</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">API access for custom integrations</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                    <p className="text-slate-300">Perfect for teams using multiple editors</p>
                  </div>
                </div>

                {/* CTA */}
                <button className="w-full py-3 px-6 rounded-xl font-semibold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2 group/btn mt-6">
                  <span>Join Waitlist</span>
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <p className="text-xs text-center text-slate-500">Q1 2026 • Free beta</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom message */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-400">
            Same AI engine. Same powerful features. <span className="text-slate-300 font-medium">Different interface.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
