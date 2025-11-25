import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Bot, Download, CheckCircle2, Globe, Code2, Zap, TestTube2, BarChart3, Boxes, Sparkles } from "lucide-react";
import FAQAccordion from "@/components/FAQAccordion";
import EmailWaitlist from "@/components/EmailWaitlist";
import AnimatedCounter from "@/components/AnimatedCounter";
import InfiniteMarquee from "@/components/InfiniteMarquee";
import TechBadgeStack from "@/components/TechBadgeStack";

export default function Home() {
  return (
    <main className="px-6 py-20 max-w-5xl mx-auto space-y-16">
      
      {/* HERO */}
      <section className="relative">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-left space-y-6 animate-slide-left">
            <div className="inline-flex items-center gap-2 bg-purple-900/20 border border-purple-500/30 px-4 py-2 rounded-full text-sm animate-pulse">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">🚀 Early Access • Launching Q1 2026</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              Write Tests
              <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">10x Faster</span>
            </h1>
            
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 px-4 py-2 rounded-full mb-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                <AnimatedCounter from={0} to={2} duration={1500} /> hours → <AnimatedCounter from={0} to={12} duration={2000} /> minutes
              </span>
              <span className="text-sm text-slate-400">for full coverage</span>
            </div>
            
            <p className="text-xl text-slate-300 leading-relaxed font-medium">
              AI agent that analyzes coverage gaps and writes missing tests automatically
            </p>
            
            <p className="text-base text-slate-400">
              Not just another generic AI assistant—specialized QA tooling for your IDE
            </p>
            
            {/* Waitlist CTA */}
            <div className="space-y-6 pt-4">
              <EmailWaitlist 
                variant="hero"
                title="Save 2 Hours Every Day"
                subtitle="Get free beta access + lifetime launch discount"
              />
            </div>
          </div>
          
          {/* Right: Product Screenshot */}
          <div className="relative group animate-slide-right parallax-slow">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-xl opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
              {/* Browser/IDE chrome */}
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                  <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                  <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                </div>
                <div className="flex-1 text-center text-sm text-slate-400">QAgenAI • VS Code</div>
              </div>
              
              {/* Screenshot placeholder - better mockup */}
              <div className="aspect-video bg-slate-950 p-4 relative overflow-hidden group/video cursor-pointer">
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
                
                {/* Typing cursor effect */}
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-2 bg-slate-800/80 px-2 py-1 rounded text-xs">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-slate-400">AI generating...</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Simulated chat interface */}
                  <div className="bg-slate-800/50 rounded p-3 text-xs animate-on-scroll">
                    <div className="text-slate-500 mb-1">You:</div>
                    <div className="text-slate-300 typing-text">Generate tests for UserService</div>
                  </div>
                  <div className="bg-purple-900/20 rounded p-3 text-xs border border-purple-500/20 animate-on-scroll animate-delay-1">
                    <div className="text-purple-400 mb-1">QAgenAI:</div>
                    <div className="text-slate-300 mb-2">✓ Generated <span className="text-purple-300 font-bold">12</span> tests</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400 animate-on-scroll animate-delay-2">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span className="font-mono">test_create_user_success</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 animate-on-scroll animate-delay-3">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span className="font-mono">test_user_validation_email</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 animate-on-scroll animate-delay-3">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span className="font-mono">test_duplicate_user_error</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-500/10 flex items-center justify-between">
                      <span className="text-purple-300 font-semibold">Coverage:</span>
                      <span className="text-emerald-400 font-bold">94% → 100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* INFINITE MARQUEE */}
      <InfiniteMarquee 
        items={[
          { text: "Saved 2 hours per day", author: "Tech Lead" },
          { text: "Coverage went from 60% to 95%", author: "QA Engineer" },
          { text: "Game changer for our team", author: "Senior Dev" },
          { text: "Best VS Code extension", author: "Developer" },
        ]}
        speed={30}
      />
      
      {/* TECH BADGE STACK */}
      <section className="text-center animate-on-scroll">
        <h3 className="text-xl font-semibold mb-6 text-slate-400">Built with modern tech</h3>
        <TechBadgeStack />
      </section>
      
      {/* BEFORE/AFTER COMPARISON */}
      <section className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-slate-700 rounded-xl p-8 md:p-12 animate-on-scroll">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3">The Difference Is Clear</h2>
          <p className="text-slate-400">See how QAgenAI transforms your testing workflow</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* WITHOUT */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl"></div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full text-sm font-semibold text-red-400 mb-3">
                Without QAgenAI
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-red-400 flex-shrink-0 mt-1">×</div>
                <div>
                  <div className="font-semibold text-slate-200">2+ hours per feature</div>
                  <div className="text-sm text-slate-400">Manual test writing</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-red-400 flex-shrink-0 mt-1">×</div>
                <div>
                  <div className="font-semibold text-slate-200">60-70% coverage</div>
                  <div className="text-sm text-slate-400">Miss edge cases</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-red-400 flex-shrink-0 mt-1">×</div>
                <div>
                  <div className="font-semibold text-slate-200">Tests break on refactor</div>
                  <div className="text-sm text-slate-400">Hours of maintenance</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-red-400 flex-shrink-0 mt-1">×</div>
                <div>
                  <div className="font-semibold text-slate-200">Context switching</div>
                  <div className="text-sm text-slate-400">Leave IDE to write tests</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* WITH */}
          <div className="bg-gradient-to-br from-purple-900/20 to-emerald-900/20 border-2 border-purple-500/50 rounded-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl"></div>
            <div className="absolute top-3 right-3">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-sm font-semibold text-emerald-400 mb-3">
                With QAgenAI
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 animate-on-scroll">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-200">12 minutes per feature</div>
                  <div className="text-sm text-slate-400">AI-generated tests</div>
                </div>
              </div>
              <div className="flex items-start gap-3 animate-on-scroll animate-delay-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-200">95%+ coverage</div>
                  <div className="text-sm text-slate-400">Edge cases included</div>
                </div>
              </div>
              <div className="flex items-start gap-3 animate-on-scroll animate-delay-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-200">Self-healing tests</div>
                  <div className="text-sm text-slate-400">Auto-update on refactor</div>
                </div>
              </div>
              <div className="flex items-start gap-3 animate-on-scroll animate-delay-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-200">Stay in your IDE</div>
                  <div className="text-sm text-slate-400">Generate with right-click</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* HOW IT WILL WORK */}
      <section className="animate-on-scroll">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3">How It Will Work</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Simple 3-step workflow when we launch</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-4xl mx-auto">
          <StepCard
            step="1"
            icon={<Download className="w-12 h-12 text-purple-400" />}
            title="Install & Configure"
            desc="Choose VS Code Extension or MCP Server. Setup takes 2 minutes."
          />
          <div className="hidden md:block text-slate-600">
            <ArrowRight className="w-8 h-8" />
          </div>
          <StepCard
            step="2"
            icon={<Bot className="w-12 h-12 text-purple-400" />}
            title="Generate Tests"
            desc="Right-click any file or chat with the agent. Tests appear in seconds."
          />
          <div className="hidden md:block text-slate-600">
            <ArrowRight className="w-8 h-8" />
          </div>
          <StepCard
            step="3"
            icon={<CheckCircle2 className="w-12 h-12 text-purple-400" />}
            title="Review & Ship"
            desc="Agent-generated tests land in your test files. Review and commit."
          />
        </div>
      </section>

      {/* COMPARE PLANS TABLE */}
      <section className="animate-on-scroll">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3">How We Compare</h2>
          <p className="text-slate-400">See why QAgenAI is built specifically for testing</p>
        </div>
        
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left p-4 text-slate-300 font-semibold">Feature</th>
                  <th className="text-center p-4 text-slate-400 font-medium">Cursor</th>
                  <th className="text-center p-4 text-slate-400 font-medium">GitHub Copilot</th>
                  <th className="text-center p-4 text-purple-400 font-semibold">QAgenAI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-300">Coverage Analysis</td>
                  <td className="text-center p-4 text-red-400">×</td>
                  <td className="text-center p-4 text-red-400">×</td>
                  <td className="text-center p-4"><CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-300">Self-Healing Tests</td>
                  <td className="text-center p-4 text-red-400">×</td>
                  <td className="text-center p-4 text-red-400">×</td>
                  <td className="text-center p-4"><CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-300">Gap Detection</td>
                  <td className="text-center p-4 text-red-400">×</td>
                  <td className="text-center p-4 text-red-400">×</td>
                  <td className="text-center p-4"><CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-300">Framework-Specific</td>
                  <td className="text-center p-4 text-yellow-400">Partial</td>
                  <td className="text-center p-4 text-yellow-400">Partial</td>
                  <td className="text-center p-4"><CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors bg-slate-800/20">
                  <td className="p-4 text-slate-300 font-semibold">Price (Solo Dev)</td>
                  <td className="text-center p-4 text-slate-300">$20/mo</td>
                  <td className="text-center p-4 text-slate-300">$10/mo</td>
                  <td className="text-center p-4 text-emerald-400 font-bold">Free</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* WHY NOT CURSOR/COPILOT - MOVED HERE */}
      <section className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-800 p-8 rounded-lg animate-on-scroll">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold mb-3">Why not just use Cursor or Copilot?</h2>
          <p className="text-slate-400 mb-6">
            Generic AI assistants write any code you ask for. QAgenAI is a specialized QA agent—use it <em>alongside</em> Cursor/Copilot via MCP or as a VS Code extension.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Generic AI */}
            <div>
              <div className="text-sm font-medium text-slate-500 mb-3">Generic AI (Cursor, Copilot)</div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">×</span>
                  <span>Writes tests if you ask, but doesn't know what's missing</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">×</span>
                  <span>No coverage analysis or gap detection</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">×</span>
                  <span>Generic responses, not QA-specialized</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-500">×</span>
                  <span>You need to know what to ask for</span>
                </div>
              </div>
            </div>
            
            {/* QAgenAI */}
            <div>
              <div className="text-sm font-medium text-purple-400 mb-3">QAgenAI</div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Analyzes your code and <strong>detects what tests are missing</strong></span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Tracks coverage gaps</strong> and suggests what to test next</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Built for <strong>QA best practices</strong> (edge cases, mocking, assertions)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Self-healing tests</strong> adapt automatically when code changes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* TWO WAYS TO USE - Coming Soon */}
      <section id="setup" className="border border-slate-700 rounded-lg p-8 bg-slate-800/30 animate-on-scroll">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">Two Ways to Use QAgenAI</h2>
          <p className="text-slate-400">Choose the setup that works best for your workflow</p>
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
        
      </section>


      {/* COMBINED: WHY + WHAT YOU GET */}
      <section className="border border-slate-800 rounded-lg p-8 md:p-12 bg-slate-900/30 animate-on-scroll">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3">What to Expect</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Your AI pair programmer for quality assurance, coming soon
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {/* LEFT: Benefits */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Planned Features</h3>
            <BenefitItem 
              icon={<Zap className="w-5 h-5" />}
              text="Generate tests 10x faster than writing manually" 
            />
            <BenefitItem 
              icon={<CheckCircle2 className="w-5 h-5" />}
              text="Self-healing tests that adapt when code changes" 
            />
            <BenefitItem 
              icon={<BarChart3 className="w-5 h-5" />}
              text="Intelligent coverage gap detection and suggestions" 
            />
            <BenefitItem 
              icon={<Boxes className="w-5 h-5" />}
              text="Flexible setup: VS Code Extension or MCP Server" 
            />
          </div>
          
          {/* RIGHT: Test Types */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Test Types Supported</h3>
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
      </section>

      {/* FAQ SECTION */}
      <section className="border border-slate-800 rounded-lg p-8 bg-slate-900/20 animate-on-scroll">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        
        <FAQAccordion
          items={[
            {
              question: "What makes QAgenAI different from Cursor or GitHub Copilot?",
              answer: "Generic AI assistants write code when you ask. QAgenAI is specialized for testing—it analyzes your codebase to detect coverage gaps, generates comprehensive test suites, and automatically adapts tests when your code changes. It's built specifically for QA workflows, not general coding."
            },
            {
              question: "How fast can QAgenAI generate tests?",
              answer: "QAgenAI generates complete test suites in seconds. For a typical service class, it creates 10-15 tests (including edge cases) in under 30 seconds—about 85% faster than writing manually."
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
              question: "Do I need my own AI API key?",
              answer: "It depends on your setup. VS Code Extension: Yes, you need your own OpenAI or Claude API key. MCP Server (Cursor/Windsurf): No, it uses your IDE's built-in AI—no extra API key needed."
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
      </section>

      {/* FINAL CTA - Minimalist Inline Signup */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10"></div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-3">
            Ready to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">10x</span> Your Testing Workflow?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Stop writing tests manually. Let AI handle it.
          </p>
          
          <EmailWaitlist variant="inline" />
        </div>
      </section>
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


