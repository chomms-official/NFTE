"use client";

import { FrameSequenceHero, type FrameSequenceStep } from "@/components/ui/mac-book-neo-hero";

const FRAME_COUNT = 5;
const framePath = (i: number) => `/product-frames/frame_${Math.min(Math.max(i - 1, 0), 4)}.jpg`;

const steps: FrameSequenceStep[] = [
  { from: 0.0, to: 0.25, color: "#926839", num: "01", total: "04", icon: "🌿",
    title: "Natural Essential Oils.",
    description: "Tangerine, Kaffir Lime, Eucalyptus, and Cedarwood. Refreshing and natural.",
    label: "Ingredients" },
  { from: 0.25, to: 0.5, color: "#6a7b3b", num: "02", total: "04", icon: "🌱",
    title: "DEET Free & Skin Friendly.",
    description: "Safe for you and your family. Crafted with care and nature in mind.",
    label: "Safe" },
  { from: 0.5, to: 0.75, color: "#d28e53", num: "03", total: "04", icon: "⏱",
    title: "4+ Hours Protection.",
    description: "Long-lasting mosquito repellent film. Surround yourself with a protective scent.",
    label: "Duration" },
  { from: 0.75, to: 1.01, color: "#4f3824", num: "04", total: "04", icon: "💧",
    title: "Eco-Friendly & Easy to use.",
    description: "Dissolve 1 film in 50ml of water. Shake well and spray on desired area.",
    label: "Usage" },
];

export default function Home() {
  return (
    <main className="bg-[#f1e5d7] min-h-screen">
      <FrameSequenceHero
        frameCount={FRAME_COUNT}
        framePath={framePath}
        eagerCount={5}
        scrollHeight="400vh"
        brand={
          <>
            <span className="fsh-brand-dot" style={{background: '#926839'}} />
            NFTE
          </>
        }
        navLinks={[
          { label: "Overview", href: "#" },
          { label: "Ingredients", href: "#" },
          { label: "How to Use", href: "#" },
          { label: "Buy", href: "#" },
        ]}
        ctaLabel="Order Now"
        ctaHref="#"
        title={
          <>
            <span className="fsh-title-dark text-amber-900 font-bold">Chomm's</span>{" "}
            <span className="fsh-title-rainbow text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 font-bold">House</span>
          </>
        }
        subtitle="Mosquito Repellent Film"
        steps={steps}
      />
    </main>
  );
}
