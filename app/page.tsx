import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { PlanCheckApp } from "@/components/PlanCheckApp";

export default function Home() {
  return (
    <>
      <Hero />
      <main id="check" className="scroll-mt-4 border-t-2 border-ink pt-10">
        <PlanCheckApp />
      </main>
      <Footer />
    </>
  );
}
