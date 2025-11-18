import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileUp, Bot, Download, CheckCircle2 } from "lucide-react";
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
          Generate Test Suites
          <br />
          in Seconds
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Upload any specification and let AI generate comprehensive test scenarios, cases, 
          Gherkin, automation code, and QA analysis instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex justify-center gap-4 pt-4">
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
        
        {/* Email Waitlist */}
        <div className="pt-8">
          <EmailWaitlist variant="hero" />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8">
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
        
        {/* Quick stats below video */}
        <div className="grid grid-cols-3 gap-6 mt-8 text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-2xl font-bold text-blue-600">~10s</p>
            <p className="text-sm text-gray-600">Average generation time</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-2xl font-bold text-blue-600">8+</p>
            <p className="text-sm text-gray-600">Output formats</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-2xl font-bold text-blue-600">Zero</p>
            <p className="text-sm text-gray-600">Manual writing needed</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <StepCard
            icon={<FileUp className="w-12 h-12 text-blue-600" />}
            title="1. Upload Document"
            desc="PDF, DOCX, TXT… any spec you have"
          />
          <StepCard
            icon={<Bot className="w-12 h-12 text-purple-600" />}
            title="2. AI Agent Generates Tests"
            desc="Scenarios, test cases, Gherkin, automation"
          />
          <StepCard
            icon={<Download className="w-12 h-12 text-green-600" />}
            title="3. Download & Copy"
            desc="Export as JSON/TXT or copy sections"
          />
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">What You Get</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard 
            title="Test Scenarios" 
            desc="High-level test scenarios covering all requirements" 
          />
          <FeatureCard 
            title="Test Cases" 
            desc="Detailed test cases with steps and expected results" 
          />
          <FeatureCard 
            title="Gherkin Format" 
            desc="BDD-style scenarios ready for automation frameworks" 
          />
          <FeatureCard 
            title="Automation Code" 
            desc="Ready-to-use automation code snippets" 
          />
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-center mb-8">Why QAgent?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <BenefitItem text="Save hours of manual test writing" />
          <BenefitItem text="Consistent test coverage" />
          <BenefitItem text="AI-powered quality assurance" />
          <BenefitItem text="Export in multiple formats" />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Trusted by QA Engineers</h2>
        <p className="text-gray-600 text-center max-w-2xl mx-auto">
          See what testing professionals are saying about QAgent
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TestimonialCard
            quote="QAgent saved me 10+ hours on test documentation. The AI-generated scenarios are incredibly accurate."
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
      </section>

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

function FeatureCard({ title, desc }: any) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </Card>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
      <span className="text-gray-700">{text}</span>
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
