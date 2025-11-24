"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <Image src="/logo.svg" alt="QAgenAI" width={32} height={32} />
          <span className="font-bold text-xl tracking-tight">QAgenAI</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <NavLink href="/" label="Home" current={path} />
          <NavLink href="/pricing" label="Pricing" current={path} />
          <a
            href="https://github.com/qagenai/vscode-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-400 hover:text-purple-400 transition"
          >
            Documentation
          </a>
          <a
            href="https://github.com/qagenai/vscode-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-400 hover:text-purple-400 transition"
          >
            GitHub
          </a>

          <Link href="https://marketplace.visualstudio.com/items?itemName=qagenai" target="_blank">
            <Button size="sm" className="px-6 bg-purple-600 hover:bg-purple-700">
              Install Extension
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
      className={`text-sm font-medium hover:text-purple-400 transition ${
        active ? "text-purple-400 font-semibold" : "text-gray-400"
      }`}
    >
      {label}
    </Link>
  );
}
