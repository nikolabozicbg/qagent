import { ArrowRight, Bot, Download, CheckCircle2, Globe, Code2, Zap, TestTube2, BarChart3, Boxes, Sparkles, Search, RefreshCw, AlertTriangle } from "lucide-react";
import FAQAccordion from "@/components/FAQAccordion";
import EmailWaitlist from "@/components/EmailWaitlist";
import { ScrollReveal } from "@/components/ScrollReveal";
import HeroSection from "@/components/sections/HeroSection";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-12 md:py-16 space-y-20 md:space-y-24">
      
      <HeroSection />
      {/* 3 CORE VALUES */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-7 hover:border-purple-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:translate-y-[-2px]">
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
            {/* Micro-detail: Example metric */}
            <div className="pt-3 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Avg detection time</span>
                <span className="font-mono text-purple-400 font-semibold tabular-nums">&lt;100ms</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-7 hover:border-emerald-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(52,211,153,0.15)] hover:translate-y-[-2px]">
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
            {/* Micro-detail: Example metric */}
            <div className="pt-3 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Typical suite size</span>
                <span className="font-mono text-emerald-400 font-semibold tabular-nums">10-15 tests</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-7 hover:border-pink-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(244,114,182,0.15)] hover:translate-y-[-2px]">
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
            {/* Micro-detail: Example metric */}
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

      {/* BIG METRICS */}
      <section className="px-6">
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
      
      {/* BEFORE/AFTER COMPARISON */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal delay={100}>
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-slate-700 rounded-xl p-8 lg:p-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>WORKFLOW TRANSFORMATION</span>
          </div>
          <h2 className="text-4xl font-bold mb-3">Before & After</h2>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-slate-500 font-medium">manual</span>
            <div className="flex items-center gap-1">
              <div className="w-8 h-px bg-gradient-to-r from-slate-600 to-purple-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
              <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-emerald-500"></div>
            </div>
            <span className="text-emerald-400 font-medium">AI-powered</span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* WITHOUT */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-xl"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-8 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400/50"></div>
                <span className="text-xs font-semibold tracking-wide text-red-400/70">WITHOUT QAGENAI</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <div className="text-red-400 text-xs">×</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-200">Hours of manual work</div>
                    <div className="text-xs text-slate-500">Writing tests takes forever</div>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <div className="text-red-400 text-xs">×</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-200">Easy to skip under pressure</div>
                    <div className="text-xs text-slate-500">Deadlines win, tests lose</div>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <div className="text-red-400 text-xs">×</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-200">Breaks on every refactor</div>
                    <div className="text-xs text-slate-500">Maintenance nightmare</div>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <div className="text-red-400 text-xs">×</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-200">No visibility into gaps</div>
                    <div className="text-xs text-slate-500">What's even missing?</div>
                  </div>
                </div>
              </div>
              
              {/* Emotional moment: the cost */}
              <div className="mt-6 pt-4 border-t border-slate-800/50">
                <div className="text-center">
                  <div className="text-[11px] text-slate-600 mb-1">Time spent per week</div>
                  <div className="font-mono text-red-400/70 text-sm font-semibold tabular-nums">~4-6 hours</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* WITH */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-purple-500/5 to-transparent rounded-xl"></div>
            <div className="absolute top-4 right-4">
              <Sparkles className="w-4 h-4 text-emerald-400/50 animate-pulse" />
            </div>
            <div className="relative bg-slate-900/80 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-8 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-semibold tracking-wide text-emerald-400">WITH QAGENAI</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-100">Generated in seconds</div>
                    <div className="text-xs text-slate-400">10-15 tests per file, instantly</div>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-100">Impossible to ignore</div>
                    <div className="text-xs text-slate-400">Gaps shown in real-time</div>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-100">Auto-heals on refactor</div>
                    <div className="text-xs text-slate-400">Tests update themselves</div>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="mt-1 w-4 h-4 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-100">Complete visibility</div>
                    <div className="text-xs text-slate-400">Live coverage dashboard</div>
                  </div>
                </div>
              </div>
              
              {/* Emotional moment: the benefit */}
              <div className="mt-6 pt-4 border-t border-emerald-500/10">
                <div className="text-center">
                  <div className="text-[11px] text-slate-600 mb-1">Time spent per week</div>
                  <div className="font-mono text-emerald-400 text-sm font-semibold tabular-nums">~15 minutes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* WHY NOT JUST ASK AI? */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>KEY DIFFERENCE</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">vs Generic AI</h2>
          <div className="inline-flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2">
            <span className="text-sm text-slate-400">reactive</span>
            <div className="flex items-center gap-1">
              <div className="w-6 h-px bg-gradient-to-r from-slate-600 to-emerald-500"></div>
              <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
            </div>
            <span className="text-sm text-emerald-400 font-medium">proactive</span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Generic AI */}
          <div className="border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-300">Generic AI</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-slate-400">
                <span className="text-slate-500 flex-shrink-0">×</span>
                <span>Waits for you</span>
              </li>
              <li className="flex items-start gap-2 text-slate-400">
                <span className="text-slate-500 flex-shrink-0">×</span>
                <span>Can't find gaps</span>
              </li>
              <li className="flex items-start gap-2 text-slate-400">
                <span className="text-slate-500 flex-shrink-0">×</span>
                <span>No auto-healing</span>
              </li>
              <li className="flex items-start gap-2 text-slate-400">
                <span className="text-slate-500 flex-shrink-0">×</span>
                <span>Easy to skip</span>
              </li>
            </ul>
          </div>
          
          {/* QAgenAI */}
          <div className="border-2 border-purple-500/50 rounded-lg p-6 bg-purple-900/10">
            <h3 className="text-lg font-semibold mb-4 text-purple-400">QAgenAI</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Watches constantly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Shows gaps live</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Heals on change</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">One click, done</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-slate-400">
              <span className="font-semibold text-slate-300">Copilot</span> → code
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="text-slate-400">
              <span className="font-semibold text-purple-400">QAgenAI</span> → tests
            </div>
          </div>
        </div>
          </div>
        </div>
      </section>

      {/* USE CASE STORY */}
      <section className="px-6">
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
      
      {/* HOW IT WILL WORK */}
      <ScrollReveal delay={200}>
        <section className="px-6">
          <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>GETTING STARTED</span>
          </div>
          <h2 className="text-4xl font-bold mb-3">Ready in 2 minutes</h2>
          <p className="text-slate-400 text-sm">Install once, use forever</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-4xl mx-auto">
          <StepCard
            step="1"
            icon={<Download className="w-12 h-12 text-purple-400" />}
            title="Install"
            desc="VS Code or MCP. Two minutes."
          />
          <div className="hidden md:block text-slate-600">
            <ArrowRight className="w-8 h-8" />
          </div>
          <StepCard
            step="2"
            icon={<Bot className="w-12 h-12 text-purple-400" />}
            title="Generate"
            desc="Right-click or ask. Instant."
          />
          <div className="hidden md:block text-slate-600">
            <ArrowRight className="w-8 h-8" />
          </div>
          <StepCard
            step="3"
            icon={<CheckCircle2 className="w-12 h-12 text-purple-400" />}
            title="Ship"
            desc="Review, merge, ship."
          />
        </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Removed comparison table and duplicate Cursor/Copilot section */}


      {/* TWO WAYS TO USE - Coming Soon */}
      <section id="setup" className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="border border-slate-700 rounded-lg p-8 bg-slate-800/30 animate-on-scroll">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>INSTALLATION OPTIONS</span>
          </div>
          <h2 className="text-4xl font-bold mb-3">Pick your platform</h2>
          <p className="text-sm text-slate-400">Both options get you full functionality</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* VS Code Extension */}
          <div className="border border-slate-600 rounded-lg p-6 bg-slate-900/50 relative overflow-hidden hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">VS Code Extension</h3>
                <p className="text-xs text-slate-500">Direct IDE integration</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Install from VS Code Marketplace</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Right-click any file → "Generate Tests"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Requires your AI API key (OpenAI/Claude)</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="inline-flex items-center gap-1.5 bg-purple-600/10 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-medium text-purple-300">
                <Sparkles className="w-3 h-3" />
                Coming Soon
              </div>
            </div>
          </div>
          
          {/* MCP Server */}
          <div className="border border-slate-600 rounded-lg p-6 bg-slate-900/50 relative overflow-hidden hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Boxes className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">MCP Server</h3>
                <p className="text-xs text-slate-500">For Cursor, Windsurf, Claude Desktop</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Add MCP server to your IDE config</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Chat with agent: "Generate tests for UserService"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Uses your IDE's AI (no extra API key needed)</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="inline-flex items-center gap-1.5 bg-purple-600/10 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-medium text-purple-300">
                <Sparkles className="w-3 h-3" />
                Coming Soon
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </section>


      {/* COMBINED: WHY + WHAT YOU GET */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="border border-slate-800 rounded-lg p-8 md:p-12 bg-slate-900/30 animate-on-scroll">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>FULL CAPABILITIES</span>
          </div>
          <h2 className="text-4xl font-bold mb-3">Everything you need</h2>
          <p className="text-sm text-slate-400">Works with your entire tech stack</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {/* LEFT: Benefits */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Core</h3>
            <BenefitItem 
              icon={<Zap className="w-5 h-5" />}
              text="Instant generation" 
            />
            <BenefitItem 
              icon={<CheckCircle2 className="w-5 h-5" />}
              text="Self-healing tests" 
            />
            <BenefitItem 
              icon={<BarChart3 className="w-5 h-5" />}
              text="Live coverage gaps" 
            />
            <BenefitItem 
              icon={<Boxes className="w-5 h-5" />}
              text="VS Code + MCP" 
            />
          </div>
          
          {/* RIGHT: Test Types */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Coverage</h3>
            <div className="grid grid-cols-2 gap-3">
              <OutputFeature icon={<TestTube2 className="w-4 h-4" />} text="Unit Tests" />
              <OutputFeature icon={<Globe className="w-4 h-4" />} text="E2E Tests" />
              <OutputFeature icon={<Code2 className="w-4 h-4" />} text="Integration Tests" />
              <OutputFeature icon={<Zap className="w-4 h-4" />} text="Snapshot Tests" />
              <OutputFeature icon={<BarChart3 className="w-4 h-4" />} text="Coverage Reports" />
              <OutputFeature icon={<CheckCircle2 className="w-4 h-4" />} text="Edge Cases" />
            </div>
          </div>
        </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="border border-slate-800 rounded-lg p-8 bg-slate-900/20 animate-on-scroll">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>QUESTIONS & ANSWERS</span>
          </div>
          <h2 className="text-4xl font-bold mb-3">Common questions</h2>
          <p className="text-sm text-slate-400">Everything you need to know before joining</p>
        </div>
        
        <FAQAccordion
          items={[
            {
              question: "Don't AI assistants like Cursor and Copilot already write tests?",
              answer: "Yes—when you ask. QAgenAI is different: it watches your code continuously and shows you what tests you're missing automatically. Think of it as test-specific Copilot that's proactive, not reactive."
            },
            {
              question: "What about tools that explore my app and generate E2E tests?",
              answer: "Great for UI smoke tests! QAgenAI complements them by handling unit and integration tests from your code—not just E2E. Use both for complete coverage: E2E tools for regression suites, QAgenAI for daily development."
            },
            {
              question: "How fast can QAgenAI generate tests?",
              answer: "Complete test suites in seconds. For a typical service class, it creates 10-15 tests (including edge cases) in under 30 seconds—about 85% faster than writing manually."
            },
            {
              question: "What does 'self-healing tests' mean?",
              answer: "When you refactor code or change APIs, your tests often break. QAgenAI detects these changes and automatically updates test assertions, mocks, and expectations to match your new code—saving hours of manual test maintenance."
            },
            {
              question: "Which testing frameworks are supported?",
              answer: "QAgenAI works with 15+ frameworks including Jest, Vitest, Playwright, Cypress, pytest, JUnit, Mocha, and more. It automatically detects your project setup and generates tests in the right format."
            },
            {
              question: "What is MCP and why use it?",
              answer: "MCP (Model Context Protocol) lets AI assistants like Cursor or Claude Desktop use specialized tools. By adding QAgenAI as an MCP server, your existing AI gets QA superpowers—coverage analysis, self-healing tests, and framework-specific generation—without switching tools."
            },
            {
              question: "Is my code sent to external servers?",
              answer: "No. With VS Code Extension, processing uses your API key directly (OpenAI/Claude APIs). With MCP Server, it runs through your IDE's AI. In both cases, only the necessary context for test generation is sent—your full codebase stays local."
            },
            {
              question: "How much does it cost?",
              answer: "QAgenAI will be free for individual developers with a fair-use limit. Team plans with advanced features will be available later. Join the waitlist for early access pricing and exclusive launch discounts."
            },
            {
              question: "Can I use QAgenAI with existing tests?",
              answer: "Yes! QAgenAI analyzes your existing test coverage and fills in gaps. It won't duplicate tests you already have—it focuses on uncovered code paths and edge cases you might have missed."
            }
          ]}
        />
          </div>
        </div>
      </section>

      {/* FINAL CTA - Minimalist Inline Signup */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative py-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10"></div>
            <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
            <div className="w-1 h-1 rounded-full bg-slate-500"></div>
            <span>JOIN THE BETA</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-3">
            Get <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">early access</span>
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
            Join 1,247 developers building better software with AI-powered testing
          </p>
          
          <EmailWaitlist variant="inline" />
            </div>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}

function StepCard({ icon, title, desc, step }: any) {
  return (
    <div className="text-center max-w-xs">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-purple-400 flex-shrink-0 mt-1">{icon}</div>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}

function OutputFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-slate-800/30 border border-slate-700 rounded-lg hover:border-purple-500/30 hover:bg-slate-800/50 transition-all">
      <div className="text-purple-400 flex-shrink-0">{icon}</div>
      <span className="text-slate-300 text-sm">{text}</span>
    </div>
  );
}


