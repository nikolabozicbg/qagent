"use client";

import { Sparkles, Zap, Shield, Clock, Code2, TrendingUp } from "lucide-react";

export default function BentoGridSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/10 via-transparent to-pink-950/10 -z-20 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 stagger-1">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-400/30 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300">Powered by AI</span>
          </div>
          <h2 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Everything you need
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Built for modern development workflows
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-2">
          {/* Large card - AI Generation */}
          <div className="lg:col-span-2 lg:row-span-2 bento-card glass-strong rounded-3xl p-8 border border-slate-700/50 shadow-depth-2 noise-overlay group">
            <div className="relative h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">AI-Powered Generation</h3>
                  <p className="text-sm text-slate-400">Context-aware test creation</p>
                </div>
              </div>
              
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl"></div>
                <div className="relative h-full p-6 bg-slate-900/50 rounded-2xl border border-slate-700/30 backdrop-blur-sm">
                  <div className="space-y-3">
                    {[
                      { label: "Unit tests", value: "94%", color: "emerald" },
                      { label: "Integration tests", value: "87%", color: "purple" },
                      { label: "Edge cases", value: "92%", color: "pink" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all group/item">
                        <span className="text-slate-300 font-medium">{item.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-32 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r from-${item.color}-500 to-${item.color}-400 rounded-full animate-shimmer`}
                              style={{ width: item.value }}
                            ></div>
                          </div>
                          <span className={`text-${item.color}-400 font-bold font-mono text-sm`}>{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Speed card */}
          <div className="bento-card glass-strong rounded-3xl p-6 border border-slate-700/50 shadow-depth-1 noise-overlay group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Lightning Fast</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">30s</span>
                <span className="text-slate-400 text-sm">avg generation</span>
              </div>
              <p className="text-slate-400 text-sm">From code analysis to ready tests</p>
            </div>
          </div>

          {/* Security card */}
          <div className="bento-card glass-strong rounded-3xl p-6 border border-slate-700/50 shadow-depth-1 noise-overlay group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Privacy First</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">Your code stays local. No data leaves your machine.</p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              End-to-end encrypted
            </div>
          </div>

          {/* Auto-heal card */}
          <div className="lg:col-span-2 bento-card glass-strong rounded-3xl p-6 border border-slate-700/50 shadow-depth-1 noise-overlay group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 animate-morph">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Auto-Heal on Refactor</h3>
                <p className="text-sm text-slate-400">Tests adapt to your code changes</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: "Detects changes", icon: "🔍" },
                { label: "Updates tests", icon: "⚡" },
                { label: "Validates coverage", icon: "✅" },
              ].map((step, i) => (
                <div key={i} className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-purple-500/30 transition-all">
                  <div className="text-3xl mb-2">{step.icon}</div>
                  <p className="text-xs text-slate-400">{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time card */}
          <div className="bento-card glass-strong rounded-3xl p-6 border border-slate-700/50 shadow-depth-1 noise-overlay group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Real-time</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Watch mode</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Coverage tracking</span>
                <span className="text-purple-400 font-semibold">Live</span>
              </div>
            </div>
          </div>

          {/* Stats card */}
          <div className="lg:col-span-3 bento-card glass-strong rounded-3xl p-6 border border-slate-700/50 shadow-depth-1 noise-overlay group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Trusted by developers worldwide</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: "1,247+", label: "Active developers" },
                { value: "50K+", label: "Tests generated" },
                { value: "15+", label: "Frameworks" },
                { value: "99.8%", label: "Uptime" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
