import { ArrowRight, Bot, Download, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

function StepCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
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

export default function GettingStartedSection() {
  return (
    <ScrollReveal delay={200}>
      <section>
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
              icon={<Download className="w-12 h-12 text-purple-400" />}
              title="Install"
              desc="VS Code or MCP. Two minutes."
            />
            <div className="hidden md:block text-slate-600">
              <ArrowRight className="w-8 h-8" />
            </div>
            <StepCard
              icon={<Bot className="w-12 h-12 text-purple-400" />}
              title="Generate"
              desc="Right-click or ask. Instant."
            />
            <div className="hidden md:block text-slate-600">
              <ArrowRight className="w-8 h-8" />
            </div>
            <StepCard
              icon={<CheckCircle2 className="w-12 h-12 text-purple-400" />}
              title="Ship"
              desc="Review, merge, ship."
            />
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
