import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileUp, Bot, Download, CheckCircle2, Globe, Code2, Zap, Crown, FileText, TestTube2, FileCode, Link as LinkIcon, BarChart3, Plug, AlertTriangle, Shield } from "lucide-react";
import EmailWaitlist from "@/components/EmailWaitlist";

export default function Home() {
  return (
    <main className="px-6 py-20 max-w-5xl mx-auto space-y-24">
      {/* HERO */}
      <section className="text-center space-y-8">
        <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
          ✨ AI-Powered Test Generation
        </div>
        
        <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          AI-Powered Test Generation
          <br />
          in Seconds
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          AI-powered test generation from documents, web apps, and API specs. Get comprehensive 
          test scenarios, cases, Gherkin, and automation code instantly.
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-6">
          <div>
            <p className="text-3xl font-bold text-blue-600">10x</p>
            <p className="text-sm text-gray-600">Faster than manual</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">50+</p>
            <p className="text-sm text-gray-600">Test types covered</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">100%</p>
            <p className="text-sm text-gray-600">Requirements traced</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex justify-center gap-4 pt-8">
          <Link href="/upload">
            <Button size="lg" className="px-10 text-lg shadow-lg hover:shadow-xl transition-shadow">
              Start Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="px-10 text-lg">
              View Pricing
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-sm text-gray-500">
          No credit card required • 3 free generations daily
        </p>
      </section>

      {/* DEMO VIDEO */}
      <section id="demo" className="scroll-mt-20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">See QAgent in Action</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Watch how QAgent transforms a simple requirement document into a comprehensive test suite
          </p>
        </div>
        
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800">
          {/* Video placeholder - replace with actual video */}
          <div className="aspect-video flex flex-col items-center justify-center text-white p-12 space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            {/*<div className="text-center">*/}
              <p className="text-xl font-semibold mb-2">Demo Video Coming Soon</p>
            {/*  <p className="text-gray-400 text-sm max-w-md">*/}
            {/*    A step-by-step walkthrough showing: Upload → AI Generation → Test Suite Export*/}
            {/*  </p>*/}
            {/*</div>*/}
            <div className="flex gap-4 text-sm text-gray-400">
              {/*<span>📄 Upload spec</span>*/}
              {/*<span>→</span>*/}
              {/*<span>🤖 AI analyzes</span>*/}
              {/*<span>→</span>*/}
              {/*<span>✅ Tests generated</span>*/}
              {/*<span>→</span>*/}
              {/*<span>📥 Export ready</span>*/}
            </div>
          </div>
          
          {/* Alternative: Embed YouTube/Loom video */}
          {/* <iframe 
            className="w-full aspect-video"
            src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
            title="QAgent Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          /> */}
        </div>
        
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <StepCard
            icon={<FileUp className="w-12 h-12 text-blue-600" />}
            title="1. Provide Input"
            desc="Upload documents, paste URLs, or connect APIs"
          />
          <StepCard
            icon={<Bot className="w-12 h-12 text-purple-600" />}
            title="2. AI Generates Tests"
            desc="Comprehensive test scenarios, cases, and automation code"
          />
          <StepCard
            icon={<Download className="w-12 h-12 text-green-600" />}
            title="3. Export & Use"
            desc="Download in multiple formats or copy sections"
          />
        </div>
      </section>

      {/* COMBINED: WHY + WHAT YOU GET */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-4xl font-bold">Why QAgenAI?</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            AI-powered test generation delivering complete coverage in seconds
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* LEFT: Benefits */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold mb-6">Key Benefits</h3>
            <BenefitItem 
              icon={<Zap className="w-6 h-6" />}
              text="10x faster than manual test writing" 
            />
            <BenefitItem 
              icon={<CheckCircle2 className="w-6 h-6" />}
              text="Consistent test coverage across all requirements" 
            />
            <BenefitItem 
              icon={<Bot className="w-6 h-6" />}
              text="AI-powered quality assurance and validation" 
            />
            <BenefitItem 
              icon={<Download className="w-6 h-6" />}
              text="Export in multiple formats (JSON, TXT, copy)" 
            />
          </div>
          
          {/* RIGHT: Features */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold mb-6">What You Get</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OutputFeature icon={<FileText className="w-5 h-5" />} text="Test Scenarios" />
              <OutputFeature icon={<TestTube2 className="w-5 h-5" />} text="Test Cases" />
              <OutputFeature icon={<FileCode className="w-5 h-5" />} text="Gherkin/BDD" />
              <OutputFeature icon={<Code2 className="w-5 h-5" />} text="Automation Code" />
              <OutputFeature icon={<LinkIcon className="w-5 h-5" />} text="Requirements RTM" />
              <OutputFeature icon={<BarChart3 className="w-5 h-5" />} text="Boundary Analysis" />
              <OutputFeature icon={<Plug className="w-5 h-5" />} text="API Test Suite" />
              <OutputFeature icon={<AlertTriangle className="w-5 h-5" />} text="Negative Tests" />
              <OutputFeature icon={<Shield className="w-5 h-5" />} text="Security Checks" />
            </div>
          </div>
        </div>
      </section>

      {/* COMING SOON FEATURES */}
      <section className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
            <Crown className="w-4 h-4" />
            Coming Soon - Pro Features
          </div>
          <h2 className="text-4xl font-bold">Advanced Test Generation</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Powerful automation capabilities launching soon. Join the waitlist for early access and exclusive launch discount.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <ComingSoonCard
            icon={<Globe className="w-10 h-10 text-blue-600" />}
            badge="Coming Q1 2025"
            title="URL → Page Objects & E2E Tests"
            description="Paste any web application URL and get automated Page Object Models"
            features={[
              "Playwright / Selenium / Cypress",
              "Smart locator strategies",
              "E2E test scaffolding",
              "Multi-page flow detection"
            ]}
          />
          
          <ComingSoonCard
            icon={<Code2 className="w-10 h-10 text-purple-600" />}
            badge="Coming Q1 2025"
            title="Swagger → API Tests"
            description="Transform OpenAPI specs into comprehensive API test suites"
            features={[
              "Postman collections",
              "REST Assured / pytest",
              "Contract testing (Pact)",
              "Request/response validation"
            ]}
          />
          
          <ComingSoonCard
            icon={<Zap className="w-10 h-10 text-orange-600" />}
            badge="Coming Q1 2025"
            title="Performance Test Generation"
            description="Generate load testing scripts from API specifications"
            features={[
              "JMeter / K6 / Locust",
              "Stress testing scenarios",
              "Load profile optimization",
              "Bottleneck detection"
            ]}
          />
        </div>
        
        <div className="text-center mt-8">
          <p className="text-lg font-semibold text-gray-700 mb-4">
            🎉 Get 50% off Pro when these features launch!
          </p>
          <EmailWaitlist variant="inline" />
        </div>
      </section>

      {/* TESTIMONIALS - Commented out until we have real reviews */}
      {/* <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Trusted by QA Engineers</h2>
        <p className="text-gray-600 text-center max-w-2xl mx-auto">
          See what testing professionals are saying about QAgenAI
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TestimonialCard
            quote="QAgenAI saved me 10+ hours on test documentation. The AI-generated scenarios are incredibly accurate."
            author="Sarah Mitchell"
            role="Senior QA Engineer"
            company="TechCorp"
            rating={5}
          />
          <TestimonialCard
            quote="Finally, a tool that understands QA workflows. The Gherkin output is production-ready."
            author="David Chen"
            role="QA Lead"
            company="StartupXYZ"
            rating={5}
          />
          <TestimonialCard
            quote="Game changer for our team. We cut test case creation time by 70% and improved coverage."
            author="Elena Rodriguez"
            role="QA Manager"
            company="Enterprise Inc"
            rating={5}
          />
        </div>
      </section> */}

      {/* FINAL CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to automate your QA process?</h2>
        <p className="text-lg mb-6 opacity-90">
          Join QA engineers using AI to speed up testing
        </p>
        <Link href="/upload">
          <Button size="lg" variant="secondary" className="px-10">
            Start Free Today
          </Button>
        </Link>
      </section>
    </main>
  );
}

function StepCard({ icon, title, desc }: any) {
  return (
    <Card className="p-8 text-center hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </Card>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <Card className="p-6 hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-blue-200">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </Card>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
      <div className="text-blue-600 flex-shrink-0 mt-0.5">{icon}</div>
      <span className="text-gray-700 font-medium">{text}</span>
    </div>
  );
}

function OutputFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow">
      <div className="text-indigo-600 flex-shrink-0">{icon}</div>
      <span className="text-gray-700 text-sm font-medium">{text}</span>
    </div>
  );
}

function TestimonialCard({ quote, author, role, company, rating }: any) {
  return (
    <Card className="p-6 hover:shadow-xl transition-shadow">
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(rating)].map((_, i) => (
          <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      
      {/* Quote */}
      <p className="text-gray-700 mb-4 italic">"{quote}"</p>
      
      {/* Author */}
      <div className="border-t pt-4">
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-600">{role}</p>
        <p className="text-xs text-gray-500">{company}</p>
      </div>
    </Card>
  );
}

function ComingSoonCard({ icon, badge, title, description, features }: any) {
  return (
    <Card className="p-6 hover:shadow-2xl transition-all hover:-translate-y-1 border-2 border-purple-200 bg-white relative overflow-hidden">
      {/* Badge */}
      <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
        {badge}
      </div>
      
      {/* Icon */}
      <div className="mb-4">
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-bold mb-2 pr-24">{title}</h3>
      
      {/* Description */}
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      {/* Features */}
      <ul className="space-y-2">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
