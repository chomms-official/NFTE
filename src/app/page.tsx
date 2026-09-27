"use client";

import { FrameSequenceHero, type FrameSequenceStep } from "@/components/ui/mac-book-neo-hero";

const steps: FrameSequenceStep[] = [
  { 
    from: 0.02, to: 0.28, color: "#8b7d6b", num: "01", total: "04", icon: "✨",
    image: "/step1.jpg",
    title: "Small film. Big protection.",
    description: "A natural mosquito repellent film that dissolves in water and transforms into a refreshing spray.",
    label: "The Film" 
  },
  { 
    from: 0.28, to: 0.55, color: "#7ca856", num: "02", total: "04", icon: "🌿",
    image: "/step2.jpg",
    title: "Signature Scent.",
    description: "Tangerine, Kaffir Lime, Eucalyptus, and Cedarwood. A refreshing scent that keeps mosquitoes away.",
    label: "Aroma" 
  },
  { 
    from: 0.55, to: 0.82, color: "#e6a817", num: "03", total: "04", icon: "💧",
    image: "/step3.jpg",
    title: "Simple steps, long-lasting.",
    description: "Take out the film, dissolve in water, pour into the bottle, shake & spray. Easy and fun to prepare.",
    label: "How to use" 
  },
  { 
    from: 0.82, to: 1.01, color: "#4a4135", num: "04", total: "04", icon: "🛡️",
    image: "/step1.jpg", // Re-using an image or you can add a 4th crop
    title: "Protection in every journey.",
    description: "DEET Free, no skin irritation, 4+ hours protection. Perfect for outdoor activities and everyday use.",
    label: "Safe & Portable" 
  },
];

export default function Home() {
  return (
    <main className="bg-[#f7f5f2] min-h-screen">
      <FrameSequenceHero
        heroImage="/hero-product.jpg"
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
