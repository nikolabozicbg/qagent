import { CheckCircle2, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function BeforeAfterSection() {
  return (
    <section>
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
  );
}
