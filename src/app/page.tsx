"use client";

import { FrameSequenceHero, type FrameSequenceStep } from "@/components/ui/mac-book-neo-hero";

const FRAME_COUNT = 10;
const framePath = (i: number) => `/storyboard/step_${Math.min(Math.max(i - 1, 0), 9)}.jpg`;

const steps: FrameSequenceStep[] = [
  { from: 0.0, to: 0.1, color: "#a5b4fc", num: "01", total: "10", icon: "📦",
    title: "Open the Package",
    description: "Carefully open the Chomm's House mosquito repellent packaging.",
    label: "Step 1" },
  { from: 0.1, to: 0.2, color: "#818cf8", num: "02", total: "10", icon: "🍃",
    title: "Take Out the Film",
    description: "Extract the 100% water-soluble natural essential oil film.",
    label: "Step 2" },
  { from: 0.2, to: 0.3, color: "#60a5fa", num: "03", total: "10", icon: "🚰",
    title: "Prepare Water",
    description: "Prepare a glass with 150-200 ml of clean water.",
    label: "Step 3" },
  { from: 0.3, to: 0.4, color: "#3b82f6", num: "04", total: "10", icon: "⏱",
    title: "Dissolve the Film",
    description: "Drop the film into the water and wait 1-2 minutes for it to dissolve.",
    label: "Step 4" },
  { from: 0.4, to: 0.5, color: "#34d399", num: "05", total: "10", icon: "🥄",
    title: "Stir Well",
    description: "Stir the mixture thoroughly until completely blended.",
    label: "Step 5" },
  { from: 0.5, to: 0.6, color: "#10b981", num: "06", total: "10", icon: "🧴",
    title: "Pour into Spray Bottle",
    description: "Carefully transfer the mixed solution into your spray bottle.",
    label: "Step 6" },
  { from: 0.6, to: 0.7, color: "#059669", num: "07", total: "10", icon: "🔒",
    title: "Close the Bottle",
    description: "Securely fasten the spray nozzle onto the bottle.",
    label: "Step 7" },
  { from: 0.7, to: 0.8, color: "#f59e0b", num: "08", total: "10", icon: "🔄",
    title: "Shake Well",
    description: "Give the bottle a good shake to ensure the oils are mixed.",
    label: "Step 8" },
  { from: 0.8, to: 0.9, color: "#d97706", num: "09", total: "10", icon: "✨",
    title: "Ready to Use",
    description: "Your natural, safe, and portable mosquito repellent is ready!",
    label: "Step 9" },
  { from: 0.9, to: 1.01, color: "#b45309", num: "10", total: "10", icon: "🏕",
    title: "Enjoy Your Day",
    description: "Protect yourself in every adventure: Outdoor, Travel, Home, Everyday.",
    label: "Step 10" },
];

export default function Home() {
  return (
    <main className="bg-[#2a2a2a] min-h-screen">
      <FrameSequenceHero
        frameCount={FRAME_COUNT}
        framePath={framePath}
        eagerCount={10}
        scrollHeight="800vh"
        brand={
          <>
            <span className="fsh-brand-dot" style={{background: '#10b981'}} />
            <span className="text-white">NFTE</span>
          </>
        }
        navLinks={[
          { label: "Overview", href: "#" },
          { label: "How to Use", href: "#" },
          { label: "Ingredients", href: "#" },
        ]}
        ctaLabel="Get Protected"
        ctaHref="#"
        title={
          <>
            <span className="fsh-title-dark text-white font-bold">Chomm's</span>{" "}
            <span className="fsh-title-rainbow text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-500 to-green-600 font-bold">House</span>
          </>
        }
        subtitle={<span className="text-gray-300">Small film. Big protection.</span> as any}
        steps={steps}
      />
    </main>
  );
}
