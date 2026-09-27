"use client";

import { FrameSequenceHero, type FrameSequenceStep } from "@/components/ui/mac-book-neo-hero";

const FRAME_COUNT = 4;

const framePath = (i: number) => `/seq_${i}.jpg`;

const steps: FrameSequenceStep[] = [
  { 
    from: 0.00, to: 0.25, color: "#8b7d6b", num: "01", total: "04", icon: "✨",
    title: "Take out the film sheet",
    description: "Small film. Big protection. A natural mosquito repellent film that is ready for your everyday adventures.",
    label: "Step 1" 
  },
  { 
    from: 0.25, to: 0.50, color: "#7ca856", num: "02", total: "04", icon: "💧",
    title: "Dissolve in water",
    description: "Simply drop the film into a glass of water. It dissolves instantly and naturally.",
    label: "Step 2" 
  },
  { 
    from: 0.50, to: 0.75, color: "#e6a817", num: "03", total: "04", icon: "🍾",
    title: "Pour into spray bottle",
    description: "Pour the dissolved solution into your portable spray bottle.",
    label: "Step 3" 
  },
  { 
    from: 0.75, to: 1.00, color: "#4a4135", num: "04", total: "04", icon: "🌿",
    title: "Shake & Spray",
    description: "Shake well and spray. Enjoy 4+ hours of natural protection with our signature scent.",
    label: "Step 4" 
  },
];

export default function Home() {
  return (
    <main className="bg-white min-h-screen">
      <FrameSequenceHero
        frameCount={FRAME_COUNT}
        framePath={framePath}
        eagerCount={4}
        scrollHeight="400vh"
        brand={
          <>
            <span className="fsh-brand-dot" />
            Chomm's House
          </>
        }
        navLinks={[
          { label: "Overview", href: "#" },
          { label: "Ingredients", href: "#" },
          { label: "How to use", href: "#" },
          { label: "Shop", href: "#" },
        ]}
        ctaLabel="Buy Now"
        ctaHref="#"
        title={
          <>
            <span className="fsh-title-dark">Mosquito</span>{" "}
            <span className="fsh-title-rainbow">Repellent Film</span>
          </>
        }
        subtitle="Scroll to explore natural protection."
        steps={steps}
      />
    </main>
  );
}
