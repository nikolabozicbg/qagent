import { Zap, CheckCircle2, BarChart3, Boxes, TestTube2, Globe, Code2 } from "lucide-react";

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

export default function CapabilitiesSection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
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
  );
}
