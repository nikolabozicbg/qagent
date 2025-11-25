import { Code2, Boxes, CheckCircle2, Sparkles } from "lucide-react";

export default function InstallationSection() {
  return (
    <section id="setup" className="px-4 sm:px-6 lg:px-8">
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
  );
}
