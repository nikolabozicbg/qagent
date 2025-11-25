import { CheckCircle2 } from "lucide-react";

export default function VsGenericAISection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
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
  );
}
