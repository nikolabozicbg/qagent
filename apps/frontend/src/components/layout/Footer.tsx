import { Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-20 bg-black">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
              <img src="/logo.svg" className="w-8 h-8" alt="QAgenAI" />
              <span className="font-bold text-lg">QAgenAI</span>
            </div>
            <p className="text-sm text-gray-500">
              AI QA Agent for your IDE • Launching Q1 2026
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6">
            <a 
              href="https://twitter.com/qagenai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-purple-400 transition"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a 
              href="https://www.linkedin.com/company/qagenai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-purple-400 transition"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a 
              href="https://github.com/nikolabozicbg/qagent" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-purple-400 transition"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© 2025 QAgenAI. All rights reserved.</p>
          <a href="mailto:feedback@qagenai.com" className="hover:text-purple-400 transition">
            feedback@qagenai.com
          </a>
        </div>
      </div>
    </footer>
  );
}
