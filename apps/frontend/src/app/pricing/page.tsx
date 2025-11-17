"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle2, Mail, Crown } from "lucide-react";
import ProModal from "@/components/subscription/ProModal";
import { useState } from "react";
import Link from "next/link";

export default function PricingPage() {
  const [open, setOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  return (
    <main className="max-w-6xl mx-auto px-6 py-20 space-y-16">

      {/* HEADER */}
      <section className="text-center space-y-4">
        <h1 className="text-5xl font-bold">Simple, Transparent Pricing</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Start free. Upgrade when you're ready. No credit card required.
        </p>
      </section>

      {/* PRICING GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* FREE PLAN */}
        <Card className="border hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription className="text-base">
              Ideal for individuals and testing the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold">$0</p>
              <p className="text-gray-500">per month</p>
            </div>

            <ul className="space-y-3 text-sm">
              <Feature text="3 generations per day" />
              <Feature text="Test scenarios" />
              <Feature text="Test cases" />
              <Feature text="Gherkin format" />
              <Feature text="Basic speed" />
              <Feature text="Community support" />
            </ul>

            <Link href="/upload" className="block">
              <Button variant="outline" className="w-full">
                Start Free
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* PRO PLAN (HIGHLIGHTED) */}
        <Card className="border-2 border-blue-600 shadow-xl relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </span>
          </div>
          
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              Pro
            </CardTitle>
            <CardDescription className="text-base">
              Perfect for QA engineers and small teams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold">$12</p>
              <p className="text-gray-500">per month</p>
            </div>

            <ul className="space-y-3 text-sm">
              <Feature text="Unlimited generations" highlight />
              <Feature text="Copy to clipboard" highlight />
              <Feature text="Export JSON & TXT" highlight />
              <Feature text="Automation code" highlight />
              <Feature text="Priority generation speed" highlight />
              <Feature text="Email support" highlight />
            </ul>

            <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        {/* ENTERPRISE PLAN */}
        <Card className="border hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl">Enterprise</CardTitle>
            <CardDescription className="text-base">
              Advanced features for organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold">Custom</p>
              <p className="text-gray-500">contact sales</p>
            </div>

            <ul className="space-y-3 text-sm">
              <Feature text="Everything in Pro" />
              <Feature text="Team accounts" />
              <Feature text="Admin dashboard" />
              <Feature text="API access" />
              <Feature text="SLA & support contract" />
              <Feature text="Custom model training" />
            </ul>

            <Button variant="outline" className="w-full" onClick={() => setEnterpriseOpen(true)}>
              <Mail className="w-4 h-4 mr-2" /> Contact Sales
            </Button>
          </CardContent>
        </Card>

      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-center">Free</th>
                <th className="py-3 px-4 text-center">Pro</th>
                <th className="py-3 px-4 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <ComparisonRow feature="Generations per day" free="3" pro="Unlimited" enterprise="Unlimited" />
              <ComparisonRow feature="Test scenarios" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Test cases" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Gherkin format" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Automation code" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Copy to clipboard" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Export JSON/TXT" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Team accounts" free="—" pro="—" enterprise="✓" />
              <ComparisonRow feature="API access" free="—" pro="—" enterprise="✓" />
              <ComparisonRow feature="Support" free="Community" pro="Email" enterprise="Priority SLA" />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Faq 
            q="How does the Free plan work?" 
            a="You can generate up to 3 test suites per day. Perfect for trying out QAgent and small projects." 
          />
          <Faq 
            q="What is included in the Pro plan?" 
            a="Unlimited usage plus automation code generation, copy/export features, and priority email support." 
          />
          <Faq 
            q="Can I cancel anytime?" 
            a="Yes, absolutely. You can cancel your subscription at any time with no penalties or fees." 
          />
          <Faq 
            q="Do I need a credit card for Free?" 
            a="No credit card required for the Free plan. Start generating tests immediately." 
          />
          <Faq 
            q="What payment methods do you accept?" 
            a="We accept all major credit cards via Stripe (coming soon in production)." 
          />
          <Faq 
            q="Is there a discount for annual billing?" 
            a="Yes! Save 20% with annual billing on Pro and Enterprise plans." 
          />
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to streamline your QA process?</h2>
        <p className="text-lg mb-6 opacity-90">
          Join hundreds of QA engineers already using QAgent
        </p>
        <Link href="/upload">
          <Button size="lg" variant="secondary" className="px-8">
            Start Free Today
          </Button>
        </Link>
      </section>

      {/* PRO MODAL */}
      <ProModal open={open} onClose={() => setOpen(false)} />

      {/* ENTERPRISE MODAL (reuse Pro for now) */}
      <ProModal
        open={enterpriseOpen}
        onClose={() => setEnterpriseOpen(false)}
      />
    </main>
  );
}

/* Feature Row */
function Feature({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-gray-700">
      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${highlight ? 'text-blue-600' : 'text-gray-400'}`} />
      <span>{text}</span>
    </li>
  );
}

/* Comparison Row */
function ComparisonRow({ feature, free, pro, enterprise }: any) {
  return (
    <tr className="border-b">
      <td className="py-3 px-4 font-medium">{feature}</td>
      <td className="py-3 px-4 text-center text-gray-600">{free}</td>
      <td className="py-3 px-4 text-center text-blue-600 font-semibold">{pro}</td>
      <td className="py-3 px-4 text-center text-gray-600">{enterprise}</td>
    </tr>
  );
}

/* FAQ Block */
function Faq({ q, a }: any) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h3 className="font-semibold text-lg mb-2">{q}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
    </div>
  );
}
