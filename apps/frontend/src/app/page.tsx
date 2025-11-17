import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileUp, Bot, Download, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <main className="px-6 py-20 max-w-5xl mx-auto space-y-24">
      {/* HERO */}
      <section className="text-center">
        <Image 
          src="/logo.svg" 
          alt="QAgent Logo"
          width={128} 
          height={128} 
          className="mx-auto mb-6" 
        />
        <h1 className="text-6xl font-bold mb-4">QAgent</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
          Autonomous AI Agent for QA.  
          Upload a specification → Get a full test suite in seconds.
        </p>

        {/* CTA Buttons */}
        <div className="flex justify-center gap-4">
          <Link href="/upload">
            <Button size="lg" className="px-10 text-lg">
              Try it now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="px-10 text-lg">
              See Pricing
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-sm text-gray-500 mt-6">
          No credit card required • 3 free generations daily
        </p>
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
