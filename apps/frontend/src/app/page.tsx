import HeroSection from "@/components/sections/HeroSection";
import CoreValuesSection from "@/components/sections/CoreValuesSection";
import MetricsSection from "@/components/sections/MetricsSection";
import BeforeAfterSection from "@/components/sections/BeforeAfterSection";
import VsGenericAISection from "@/components/sections/VsGenericAISection";
import UseCaseStorySection from "@/components/sections/UseCaseStorySection";
import GettingStartedSection from "@/components/sections/GettingStartedSection";
import InstallationSection from "@/components/sections/InstallationSection";
import CapabilitiesSection from "@/components/sections/CapabilitiesSection";
import FAQSection from "@/components/sections/FAQSection";
import CTASection from "@/components/sections/CTASection";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <div className="container mx-auto max-w-[1400px] py-12 md:py-16 space-y-20 md:space-y-24">
        <HeroSection />
        <CoreValuesSection />
        <MetricsSection />
        <BeforeAfterSection />
        <VsGenericAISection />
        <UseCaseStorySection />
        <GettingStartedSection />
        <InstallationSection />
        <CapabilitiesSection />
        <FAQSection />
        <CTASection />
      </div>
    </main>
  );
}
