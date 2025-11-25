import FAQAccordion from "@/components/FAQAccordion";

export default function FAQSection() {
  return (
    <section>
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
  );
}
