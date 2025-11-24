import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Bot, Download, CheckCircle2, Globe, Code2, Zap, TestTube2, BarChart3, Boxes } from "lucide-react";
import FAQAccordion from "@/components/FAQAccordion";

export default function Home() {
  return (
    <main className="px-6 py-20 max-w-5xl mx-auto space-y-24">
      
      {/* HERO */}
      <section className="relative">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-full text-sm">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">AI-Powered Test Generation</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Write Tests
              <span className="block text-purple-400">10x Faster</span>
            </h1>
            
            <p className="text-xl text-slate-400 leading-relaxed">
              Specialized QA agent that generates tests in seconds, self-heals when code changes, and hits 100% coverage—not just another generic AI assistant.
            </p>
            
            {/* Benchmark stats */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span><strong className="text-white">85% faster</strong> than manual testing</span>
              </div>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span><strong className="text-white">12 tests</strong> in 30 seconds</span>
              </div>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="#setup">
                <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              
              <Link href="https://github.com/qagenai/vscode-extension" target="_blank">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg border-slate-700 hover:border-slate-600 hover:bg-slate-800/50">
                  View Docs
                </Button>
              </Link>
            </div>
            
            <p className="text-xs text-slate-500">
              Available as VS Code Extension or MCP Server for Cursor/Windsurf
            </p>
          </div>
          
          {/* Right: Product Screenshot */}
          <div className="relative">
            <div className="rounded-xl border-2 border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
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
              <div className="aspect-video bg-slate-950 p-4">
                <div className="space-y-2">
                  {/* Simulated chat interface */}
                  <div className="bg-slate-800/50 rounded p-3 text-xs">
                    <div className="text-slate-500 mb-1">You:</div>
                    <div className="text-slate-300">Generate tests for UserService</div>
                  </div>
                  <div className="bg-purple-900/20 rounded p-3 text-xs border border-purple-500/20">
                    <div className="text-purple-400 mb-1">QAgenAI:</div>
                    <div className="text-slate-300 mb-2">✓ Generated 12 tests</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>test_create_user_success</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>test_user_validation_email</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>test_duplicate_user_error</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-500/10 text-purple-300">
                      Coverage: 94% → 100%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs opacity-90">Coverage</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* WHY NOT CURSOR/COPILOT */}
      <section className="border-l-4 border-purple-500 bg-slate-900/30 p-8 rounded-r-lg">
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
                  <span className="text-slate-600">•</span>
                  <span>Writes tests if you ask, but doesn't know what's missing</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-600">•</span>
                  <span>No coverage analysis or gap detection</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-600">•</span>
                  <span>Generic responses, not QA-specialized</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="text-slate-600">•</span>
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


      {/* TWO WAYS TO USE */}
      <section id="setup" className="border border-slate-800 rounded-lg p-8 bg-slate-900/30">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold mb-3">Two Ways to Use QAgenAI</h2>
          <p className="text-slate-400 text-sm">Choose the setup that works best for your workflow</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* VS Code Extension */}
          <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-blue-400" />
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
            <Link href="https://marketplace.visualstudio.com/items?itemName=qagenai" target="_blank" className="mt-4 inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                Install Extension
              </Button>
            </Link>
          </div>
          
          {/* MCP Server */}
          <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
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
            <Link href="https://github.com/qagenai/vscode-extension" target="_blank" className="mt-4 inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                Setup Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Simplified */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Simple 3-step workflow, regardless of setup</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard
            step="1"
            icon={<Download className="w-10 h-10 text-purple-400" />}
            title="Install & Configure"
            desc="Choose extension or MCP setup. Configuration takes 2 minutes."
          />
          <StepCard
            step="2"
            icon={<Bot className="w-10 h-10 text-purple-400" />}
            title="Generate Tests"
            desc="Right-click file or chat with agent. Tests appear in seconds."
          />
          <StepCard
            step="3"
            icon={<CheckCircle2 className="w-10 h-10 text-purple-400" />}
            title="Review & Run"
            desc="Agent-generated tests in your test files. Run to verify coverage."
          />
        </div>
      </section>

      {/* COMBINED: WHY + WHAT YOU GET */}
      <section className="border border-slate-800 rounded-lg p-8 md:p-12 bg-slate-900/30">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Why QAgenAI?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Your AI pair programmer for quality assurance
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {/* LEFT: Benefits */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
            <BenefitItem 
              icon={<Zap className="w-5 h-5" />}
              text="Generate tests 10x faster than writing manually" 
            />
            <BenefitItem 
              icon={<CheckCircle2 className="w-5 h-5" />}
              text="Self-healing tests adapt automatically when code changes" 
            />
            <BenefitItem 
              icon={<BarChart3 className="w-5 h-5" />}
              text="Hit 100% coverage with intelligent gap detection" 
            />
            <BenefitItem 
              icon={<Boxes className="w-5 h-5" />}
              text="Two setup options: VS Code Extension or MCP Server" 
            />
          </div>
          
          {/* RIGHT: Features */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">What You Get</h3>
            <div className="grid grid-cols-2 gap-3">
              <OutputFeature icon={<TestTube2 className="w-4 h-4" />} text="Unit Tests" />
              <OutputFeature icon={<Globe className="w-4 h-4" />} text="E2E Tests" />
              <OutputFeature icon={<Code2 className="w-4 h-4" />} text="Integration Tests" />
              <OutputFeature icon={<Zap className="w-4 h-4" />} text="Auto-Fix" />
              <OutputFeature icon={<BarChart3 className="w-4 h-4" />} text="Coverage Analysis" />
              <OutputFeature icon={<CheckCircle2 className="w-4 h-4" />} text="Edge Cases" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-8">
        <h2 className="text-2xl font-semibold text-center mb-8">Frequently Asked Questions</h2>
        
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
              question: "Can I use QAgenAI with existing tests?",
              answer: "Yes! QAgenAI analyzes your existing test coverage and fills in gaps. It won't duplicate tests you already have—it focuses on uncovered code paths and edge cases you might have missed."
            }
          ]}
        />
      </section>

      {/* FINAL CTA - Clean & Focused */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold mb-4">Start Writing Better Tests Today</h2>
        <p className="text-slate-400 text-lg mb-6 max-w-xl mx-auto">
          Free forever. No credit card. Setup takes 2 minutes.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="https://marketplace.visualstudio.com/items?itemName=qagenai" target="_blank">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4">
              <Code2 className="w-5 h-5 mr-2" />
              VS Code Extension
            </Button>
          </Link>
          
          <Link href="https://github.com/qagenai/vscode-extension#mcp-setup" target="_blank">
            <Button size="lg" variant="outline" className="border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 px-8 py-4">
              <Boxes className="w-5 h-5 mr-2" />
              MCP Server Setup
            </Button>
          </Link>
        </div>
        
        <p className="text-slate-500 text-xs mt-6">
          Supports Jest, Vitest, Playwright, Cypress, pytest, JUnit + 10 more
        </p>
      </section>
    </main>
  );
}

function StepCard({ icon, title, desc, step }: any) {
  return (
    <Card className="relative p-8 border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
      {/* Step number badge */}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
        {step}
      </div>
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </Card>
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
    <div className="flex items-center gap-2 p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
      <div className="text-purple-400 flex-shrink-0">{icon}</div>
      <span className="text-slate-300 text-sm">{text}</span>
    </div>
  );
}


