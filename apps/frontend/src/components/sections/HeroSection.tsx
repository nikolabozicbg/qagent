import { CheckCircle2 } from "lucide-react";
import EmailWaitlist from "@/components/EmailWaitlist";

export default function HeroSection() {
  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          {/* Left: Content */}
          <div className="text-left space-y-6 animate-slide-left">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-400/30 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
              <span className="text-purple-300">Q1 2026</span>
            </div>
            
            <div className="space-y-3 mb-10">
              <div className="inline-flex items-center gap-2.5 mb-3 group">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></div>
                </div>
                <div className="text-[10px] font-bold text-purple-400/90 tracking-[0.25em] uppercase">Automated Testing</div>
              </div>
              <h1 className="text-[56px] md:text-[72px] font-bold leading-[0.95] tracking-[-0.02em]">
                <span className="block text-white/95 mb-2">Tests that</span>
                <span className="block relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">write themselves</span>
                  <span className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-purple-500/20 via-pink-500/30 to-purple-500/20 blur-3xl -z-10 animate-pulse-slow"></span>
                  <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent blur-sm"></span>
                </span>
              </h1>
            </div>
            
            <p className="text-[18px] text-slate-400/90 leading-[1.7] max-w-[560px] mb-10 font-light">
              Your AI testing copilot. <span className="text-slate-300">Watches code</span>, detects gaps, generates tests, and <span className="text-slate-300">auto-heals on refactor</span>. Ship with confidence, every time.
            </p>
            
            <div className="flex flex-wrap gap-3 mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
                <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                <span className="text-[12px] text-slate-400 font-medium">Real-time detection</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
                <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                <span className="text-[12px] text-slate-400 font-medium">15+ frameworks</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
                <div className="w-1 h-1 rounded-full bg-pink-400"></div>
                <span className="text-[12px] text-slate-400 font-medium">Zero maintenance</span>
              </div>
            </div>
            
            <div className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-slate-800/40 via-slate-800/30 to-slate-800/40 backdrop-blur-xl border border-slate-700/40 rounded-2xl px-6 py-4 hover:border-slate-600/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative flex items-center gap-3">
                <kbd className="px-3 py-2 text-[11px] font-mono font-semibold bg-slate-900/90 border border-slate-700/80 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:border-slate-600 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-all">
                  <span className="text-slate-400">right-click</span>
                </kbd>
                
                <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
                  </div>
                  <span className="text-[14px] text-emerald-400 font-semibold">12 tests ready</span>
                </div>
              </div>
              
              <div className="relative w-px h-6 bg-gradient-to-b from-transparent via-slate-700/50 to-transparent"></div>
              
              <div className="relative flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[12px] text-slate-500 font-semibold tabular-nums">30 sec</span>
              </div>
              
              <div className="relative w-px h-6 bg-gradient-to-b from-transparent via-slate-700/50 to-transparent"></div>
              
              <div className="relative flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[12px] text-slate-400 font-medium">100% coverage</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-slate-900"></div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-slate-900"></div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-slate-900"></div>
                <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400">1K+</span>
                </div>
              </div>
              <span className="text-[12px] text-slate-500">Trusted by developers at top companies</span>
            </div>
            
            <div className="space-y-6 pt-4">
              <EmailWaitlist 
                variant="hero"
                title="Join the waitlist"
                subtitle="1,247 developers ahead of you"
              />
            </div>
          </div>
          
          {/* Right: Product Screenshot */}
          <div className="relative lg:ml-8 w-full max-w-2xl mx-auto lg:mx-0">
            <div className="absolute -inset-4 bg-gradient-to-tr from-purple-600/30 via-pink-600/30 to-purple-600/30 rounded-3xl blur-3xl opacity-20 group-hover:opacity-30 transition-all duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-2xl"></div>
            
            <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-900/50 overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
              <div className="bg-slate-800/80 backdrop-blur-sm px-5 py-3.5 flex items-center gap-3 border-b border-slate-700/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                </div>
                <div className="flex-1 text-center text-[13px] font-medium text-slate-400">QAgenAI • VS Code Extension</div>
              </div>
              
              <div className="aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 relative overflow-hidden group/video cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/50 via-black/40 to-black/50 backdrop-blur-sm opacity-0 group-hover/video:opacity-100 transition-all duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-110 hover:shadow-[0_0_60px_rgba(168,85,247,0.7)] transition-all duration-300 group/play">
                      <svg className="w-9 h-9 text-white ml-1 group-hover/play:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 px-3 py-2 rounded-lg shadow-xl">
                    <div className="relative">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                      <div className="absolute inset-0 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-300">AI generating...</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-slate-700/40 animate-on-scroll">
                    <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">You</div>
                    <div className="text-slate-200 text-[13px] font-medium">Generate tests for UserService</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-900/30 via-purple-900/20 to-purple-900/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] animate-on-scroll animate-delay-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-purple-400 text-[10px] font-bold uppercase tracking-wider">QAgenAI</div>
                      <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent"></div>
                    </div>
                    
                    <div className="text-slate-200 text-[13px] mb-3">
                      <span className="text-emerald-400 font-bold">12 tests</span> generated successfully
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-300 text-[11px] animate-on-scroll animate-delay-2">
                        <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <span className="font-mono">test_create_user_success</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-300 text-[11px] animate-on-scroll animate-delay-3">
                        <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <span className="font-mono">test_user_validation_email</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-300 text-[11px] animate-on-scroll animate-delay-3">
                        <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <span className="font-mono">test_duplicate_user_error</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
                      <span className="text-purple-300/80 text-[11px] font-semibold">Coverage</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-mono">94%</span>
                        <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-emerald-400 text-[12px] font-bold font-mono">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
