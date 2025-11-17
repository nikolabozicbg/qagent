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
