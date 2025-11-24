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
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Start with the free VS Code extension. Upgrade for unlimited generations and advanced features.
        </p>
      </section>

      {/* PRICING GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* FREE PLAN */}
        <Card className="border border-white/10 bg-white/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription className="text-base text-gray-400">
              Perfect for individuals and small projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold">$0</p>
              <p className="text-gray-500">forever</p>
            </div>

            <ul className="space-y-3 text-sm">
              <Feature text="10 test generations per day" />
              <Feature text="Unit & integration tests" />
              <Feature text="Basic test generation" />
              <Feature text="Works offline (local)" />
              <Feature text="Community support" />
              <Feature text="Popular frameworks" />
            </ul>

            <Link href="https://marketplace.visualstudio.com/items?itemName=qagenai" target="_blank" className="block">
              <Button variant="outline" className="w-full">
                Install Extension
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* PRO PLAN (HIGHLIGHTED) */}
        <Card className="border-2 border-purple-500 shadow-2xl shadow-purple-500/20 relative bg-white/5">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </span>
          </div>
          
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Crown className="w-6 h-6 text-purple-400" />
              Pro
            </CardTitle>
            <CardDescription className="text-base text-gray-400">
              For professional developers and QA teams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold">$29</p>
              <p className="text-gray-500">per month</p>
            </div>

            <ul className="space-y-3 text-sm">
              <Feature text="Unlimited test generations" highlight />
              <Feature text="Auto-fix failing tests" highlight />
              <Feature text="Coverage analysis & heatmap" highlight />
              <Feature text="E2E test generation" highlight />
              <Feature text="Jira & TestRail sync" highlight />
              <Feature text="Priority email support" highlight />
            </ul>
            
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Coming Soon:
              </p>
              <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Multi-IDE support (Cursor, Windsurf)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Advanced test strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Team collaboration features</span>
                </li>
              </ul>
            </div>

            <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        {/* ENTERPRISE PLAN */}
        <Card className="border border-white/10 bg-white/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-2xl">Enterprise</CardTitle>
            <CardDescription className="text-base text-gray-400">
              For large teams and organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-bold">Custom</p>
              <p className="text-gray-500">contact sales</p>
            </div>

            <ul className="space-y-3 text-sm">
              <Feature text="Everything in Pro" />
              <Feature text="Team accounts & SSO" />
              <Feature text="Admin dashboard" />
              <Feature text="Custom integrations" />
              <Feature text="SLA & priority support" />
              <Feature text="On-premise deployment" />
            </ul>

            <Button variant="outline" className="w-full" onClick={() => setEnterpriseOpen(true)}>
              <Mail className="w-4 h-4 mr-2" /> Contact Sales
            </Button>
          </CardContent>
        </Card>

      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-white/5 border border-white/10 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-center">Free</th>
                <th className="py-3 px-4 text-center">Pro</th>
                <th className="py-3 px-4 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="bg-white/5 font-semibold">
                <td colSpan={4} className="py-2 px-4">Core Features</td>
              </tr>
              <ComparisonRow feature="Test generations per day" free="10" pro="Unlimited" enterprise="Unlimited" />
              <ComparisonRow feature="Unit test generation" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Integration test generation" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="E2E test generation" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Works offline (local)" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Popular frameworks" free="✓" pro="✓" enterprise="✓" />
              
              <tr className="bg-white/5 font-semibold">
                <td colSpan={4} className="py-2 px-4">Advanced Features</td>
              </tr>
              <ComparisonRow feature="Auto-fix failing tests" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Coverage analysis" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Visual coverage heatmap" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Jira/TestRail sync" free="—" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Test documentation export" free="—" pro="✓" enterprise="✓" />
              
              <tr className="bg-white/5 font-semibold">
                <td colSpan={4} className="py-2 px-4">IDE Integration</td>
              </tr>
              <ComparisonRow feature="VS Code extension" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Cursor/Windsurf (MCP)" free="—" pro="Coming Soon" enterprise="Coming Soon" />
              <ComparisonRow feature="Chat sidebar" free="✓" pro="✓" enterprise="✓" />
              <ComparisonRow feature="Inline test generation" free="✓" pro="✓" enterprise="✓" />
              
              <tr className="bg-white/5 font-semibold">
                <td colSpan={4} className="py-2 px-4">Team & Enterprise</td>
              </tr>
              <ComparisonRow feature="Team accounts & SSO" free="—" pro="—" enterprise="✓" />
              <ComparisonRow feature="Admin dashboard" free="—" pro="—" enterprise="✓" />
              <ComparisonRow feature="Custom integrations" free="—" pro="—" enterprise="✓" />
              <ComparisonRow feature="On-premise deployment" free="—" pro="—" enterprise="✓" />
              <ComparisonRow feature="Dedicated support" free="—" pro="—" enterprise="✓" />
              
              <tr className="bg-white/5 font-semibold">
                <td colSpan={4} className="py-2 px-4">Support</td>
              </tr>
              <ComparisonRow feature="Support" free="Community" pro="Email" enterprise="Priority + SLA" />
              <ComparisonRow feature="Response time" free="—" pro="24-48h" enterprise="<4h" />
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
            a="Install the VS Code extension and generate up to 10 tests per day. Works entirely offline on your local machine. No credit card required." 
          />
          <Faq 
            q="What is included in the Pro plan?" 
            a="Unlimited test generation, auto-fix failing tests, coverage analysis with visual heatmap, E2E tests, Jira/TestRail sync, and priority email support." 
          />
          <Faq 
            q="Can I cancel anytime?" 
            a="Yes, absolutely. You can cancel your subscription at any time with no penalties or fees." 
          />
          <Faq 
            q="Do I need a credit card for Free?" 
            a="No credit card required for the Free plan. Just install the extension from VS Code Marketplace and start generating tests." 
          />
          <Faq 
            q="Does it work offline?" 
            a="Yes! The Free plan works completely offline using local execution. Pro plan offers both local and cloud execution options." 
          />
          <Faq 
            q="What frameworks are supported?" 
            a="Jest, Vitest, Playwright, Cypress, Mocha, Jasmine, and more. We support 15+ popular testing frameworks across unit, integration, and E2E tests." 
          />
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to transform your testing workflow?</h2>
        <p className="text-lg mb-6 opacity-90">
          Install the VS Code extension and start generating tests in minutes
        </p>
        <Link href="https://marketplace.visualstudio.com/items?itemName=qagenai" target="_blank">
          <Button size="lg" className="px-8 bg-white text-purple-600 hover:bg-gray-100">
            Install Extension
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
    <li className="flex items-center gap-2 text-gray-300">
      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${highlight ? 'text-purple-400' : 'text-gray-500'}`} />
      <span>{text}</span>
    </li>
  );
}

/* Comparison Row */
function ComparisonRow({ feature, free, pro, enterprise }: any) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-3 px-4 font-medium text-gray-300">{feature}</td>
      <td className="py-3 px-4 text-center text-gray-400">{free}</td>
      <td className="py-3 px-4 text-center text-purple-400 font-semibold">{pro}</td>
      <td className="py-3 px-4 text-center text-gray-400">{enterprise}</td>
    </tr>
  );
}

/* FAQ Block */
function Faq({ q, a }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all">
      <h3 className="font-semibold text-lg mb-2">{q}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
    </div>
  );
}
