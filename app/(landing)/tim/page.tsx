import { FoundersSection } from "@/components/features/team/FoundersSection";
import { TeamCtaSection } from "@/components/features/team/TeamCtaSection";
import { TeamExpertiseSection } from "@/components/features/team/TeamExpertiseSection";
import { TeamHero } from "@/components/features/team/TeamHero";

export default function TimPage() {
  return (
    <div className="min-h-[calc(100vh-80px)]">
      <TeamHero />
      <FoundersSection />
      <TeamExpertiseSection />
      <TeamCtaSection />
    </div>
  );
}
