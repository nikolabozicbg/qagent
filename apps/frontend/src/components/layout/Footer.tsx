import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import EmailWaitlist from "@/components/EmailWaitlist";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-20 bg-black">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" className="w-8 h-8" alt="QAgenAI" />
              <span className="font-bold text-lg">QAgenAI</span>
            </div>
            <p className="text-sm text-gray-500">
              AI QA Agent that lives in your IDE
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Product</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/pricing" className="hover:text-purple-400 transition">Pricing</Link></li>
              <li><Link href="https://github.com/qagenai/vscode-extension" target="_blank" className="hover:text-purple-400 transition">Documentation</Link></li>
              <li><Link href="https://marketplace.visualstudio.com/items?itemName=qagenai" target="_blank" className="hover:text-purple-400 transition">Install Extension</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Company</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-purple-400 transition">About</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Blog</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Careers</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Stay Updated</h3>
            <p className="text-xs text-gray-500 mb-3">
              Get notified about new features and Pro launch
            </p>
            <EmailWaitlist variant="inline" />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-500">
            <p>© 2025 QAgenAI. All rights reserved.</p>
            <div className="flex gap-3 text-xs">
              <Link href="/privacy" className="hover:text-purple-400 transition">Privacy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-purple-400 transition">Terms</Link>
              <span>•</span>
              <a href="mailto:support@qagenai.com" className="hover:text-purple-400 transition">Contact</a>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex gap-4">
            <a href="#" className="text-gray-500 hover:text-purple-400 transition">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://github.com/qagenai" target="_blank" className="text-gray-500 hover:text-purple-400 transition">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-purple-400 transition">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
