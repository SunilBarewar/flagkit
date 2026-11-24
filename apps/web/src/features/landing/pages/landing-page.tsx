import { CtaSection, LandingFooter } from "../components/cta-footer";
import { FeaturesSection } from "../components/features-section";
import { Hero } from "../components/hero";
import { HowItWorks } from "../components/how-it-works";
import { LandingNavbar } from "../components/landing-navbar";

export function LandingPage() {
  return (
    <div className="min-h-svh">
      <LandingNavbar />
      <main>
        <Hero />
        <FeaturesSection />
        <HowItWorks />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
