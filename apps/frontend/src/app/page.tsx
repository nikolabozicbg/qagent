"use client";

import HeroSection from "@/components/sections/HeroSection";
import CoreValuesSection from "@/components/sections/CoreValuesSection";
import MetricsSection from "@/components/sections/MetricsSection";
import GettingStartedSection from "@/components/sections/GettingStartedSection";
import InstallationSection from "@/components/sections/InstallationSection";
import CapabilitiesSection from "@/components/sections/CapabilitiesSection";
import FAQSection from "@/components/sections/FAQSection";
import CTASection from "@/components/sections/CTASection";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Home() {
  useScrollReveal();
  
  return (
      <main className="pt-24 md:pt-32">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-10 lg:px-16 py-12 md:py-16 space-y-20 md:space-y-24">

        <HeroSection />
        <MetricsSection />
        <CoreValuesSection />
        <GettingStartedSection />
        <InstallationSection />
        <CapabilitiesSection />
        <FAQSection />
        <CTASection />
      </div>
    </main>
  );
}
