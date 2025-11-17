#!/bin/bash

cd "$(dirname "$0")/apps/frontend" || exit 1

echo "🔥 Adding FULL UX IMPROVEMENTS (Navbar + Footer + CTA) ..."

###############################################################################
# 1. CREATE NAVBAR COMPONENT (sticky, responsive)
###############################################################################

mkdir -p src/components/layout

cat > src/components/layout/Navbar.tsx << 'EOF'
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b shadow-sm">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <Image src="/logo.svg" alt="QAgent" width={32} height={32} />
          <span className="font-bold text-xl tracking-tight">QAgent</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <NavLink href="/" label="Home" current={path} />
          <NavLink href="/pricing" label="Pricing" current={path} />
          <NavLink href="/demo" label="Demo" current={path} />

          <Link href="/upload">
            <Button size="sm" className="px-6">
              Try Free
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, label, current }: any) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={`text-sm font-medium hover:text-blue-600 transition ${
        active ? "text-blue-600 font-semibold" : "text-gray-700"
      }`}
    >
      {label}
    </Link>
  );
}
EOF

###############################################################################
# 2. CREATE FOOTER COMPONENT
###############################################################################

cat > src/components/layout/Footer.tsx << 'EOF'
import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t mt-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" className="w-8 h-8" alt="QAgent" />
              <span className="font-bold text-lg">QAgent</span>
            </div>
            <p className="text-sm text-gray-600">
              AI-powered test generation for QA teams
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Product</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/pricing" className="hover:text-blue-600">Pricing</Link></li>
              <li><Link href="/demo" className="hover:text-blue-600">Demo</Link></li>
              <li><Link href="/upload" className="hover:text-blue-600">Try Free</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">About</a></li>
              <li><a href="#" className="hover:text-blue-600">Blog</a></li>
              <li><a href="#" className="hover:text-blue-600">Careers</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">Privacy</a></li>
              <li><a href="#" className="hover:text-blue-600">Terms</a></li>
              <li><a href="#" className="hover:text-blue-600">Contact</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600">
            © 2025 QAgent. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-blue-600 transition">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-600 transition">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-600 transition">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
EOF

###############################################################################
# 3. UPDATE ROOT LAYOUT WITH NAVBAR + FOOTER
###############################################################################

cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: 'QAgent - AI Test Generation',
  description: 'Autonomous AI Agent for QA - Generate test suites in seconds',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
EOF

###############################################################################
# 4. UPDATE LANDING PAGE WITH BETTER CTA
###############################################################################

cat > src/app/page.tsx << 'EOF'
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <StepCard
          icon="📄"
          title="1. Upload Document"
          desc="PDF, DOCX, TXT… any spec you have"
        />
        <StepCard
          icon="🤖"
          title="2. AI Agent Generates Tests"
          desc="Scenarios, test cases, Gherkin, automation"
        />
        <StepCard
          icon="⚡"
          title="3. Download & Copy"
          desc="Export as JSON/TXT or copy sections"
        />
      </section>

      {/* WHAT YOU GET */}
      <section className="text-center">
        <h2 className="text-3xl font-bold mb-4">What You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
          <FeatureCard title="Test Scenarios" desc="High-level test scenarios covering all requirements" />
          <FeatureCard title="Test Cases" desc="Detailed test cases with steps and expected results" />
          <FeatureCard title="Gherkin Format" desc="BDD-style scenarios ready for automation frameworks" />
          <FeatureCard title="Automation Code" desc="Ready-to-use automation code snippets" />
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
    <Card className="p-6 text-center hover:shadow-lg transition-shadow">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </Card>
  );
}

function FeatureCard({ title, desc }: any) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border hover:border-blue-200 transition">
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
EOF

###############################################################################
# DONE
###############################################################################

echo ""
echo "✅ Full UX Upgrade Complete!"
echo ""
echo "Added:"
echo "  ✓ Sticky Navbar with logo and navigation"
echo "  ✓ Comprehensive Footer with social links"
echo "  ✓ Improved landing page with dual CTA buttons"
echo "  ✓ Final CTA section with gradient"
echo "  ✓ Social proof text"
echo ""
echo "Pages updated:"
echo "  • src/app/layout.tsx"
echo "  • src/app/page.tsx"
echo "  • src/components/layout/Navbar.tsx (new)"
echo "  • src/components/layout/Footer.tsx (new)"
echo ""
echo "Run: npm run dev"
echo ""
