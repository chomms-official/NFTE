"use client";

import { ChommsHouse3DHero, type FrameSequenceStep } from "@/components/ui/chomms-house-3d-hero";
import { 
  Sparkles, PackageOpen, Layers, GlassWater, 
  Droplets, RotateCw, ArrowDownRight, CircleCheck, 
  RefreshCw, SprayCan, Mountain 
} from "lucide-react";

const steps: FrameSequenceStep[] = [
  {
    from: 0.00,
    to: 0.055,
    color: "#8B633E",
    num: "01",
    total: "11",
    icon: <Sparkles size={20} strokeWidth={1.5} />,
    title: "Small film. Big protection.",
    description: "Meet Chomm’s House — a compact mosquito repellent film that transforms into a convenient spray.",
    label: "Overview",
  },
  {
    from: 0.055,
    to: 0.145,
    color: "#A97A4D",
    num: "02",
    total: "11",
    icon: <PackageOpen size={20} strokeWidth={1.5} />,
    title: "Open the package.",
    description: "Start with one Chomm’s House film pouch and gently open it at the tear notch.",
    label: "Open",
  },
  {
    from: 0.145,
    to: 0.235,
    color: "#C09A73",
    num: "03",
    total: "11",
    icon: <Layers size={20} strokeWidth={1.5} />,
    title: "Take out the film.",
    description: "Carefully remove one thin, translucent dissolvable film sheet from the pouch.",
    label: "Film",
  },
  {
    from: 0.235,
    to: 0.325,
    color: "#7F9586",
    num: "04",
    total: "11",
    icon: <GlassWater size={20} strokeWidth={1.5} />,
    title: "Prepare the water.",
    description: "Prepare a clean glass of water before adding the dissolvable film.",
    label: "Water",
  },
  {
    from: 0.325,
    to: 0.425,
    color: "#7FA39A",
    num: "05",
    total: "11",
    icon: <Droplets size={20} strokeWidth={1.5} />,
    title: "Dissolve the film.",
    description: "Place the film into the water and allow it to dissolve into the solution.",
    label: "Dissolve",
  },
  {
    from: 0.425,
    to: 0.515,
    color: "#A28A63",
    num: "06",
    total: "11",
    icon: <RotateCw size={20} strokeWidth={1.5} />,
    title: "Mix until dissolved.",
    description: "Gently stir the solution until the film has blended evenly into the water.",
    label: "Mix",
  },
  {
    from: 0.515,
    to: 0.635,
    color: "#936D4A",
    num: "07",
    total: "11",
    icon: <ArrowDownRight size={20} strokeWidth={1.5} />,
    title: "Pour into the spray bottle.",
    description: "Transfer the prepared solution into the Chomm’s House spray bottle.",
    label: "Fill",
  },
  {
    from: 0.635,
    to: 0.715,
    color: "#B08A60",
    num: "08",
    total: "11",
    icon: <CircleCheck size={20} strokeWidth={1.5} />,
    title: "Close the bottle.",
    description: "Secure the spray pump firmly and prepare the bottle for use.",
    label: "Close",
  },
  {
    from: 0.715,
    to: 0.805,
    color: "#788B73",
    num: "09",
    total: "11",
    icon: <RefreshCw size={20} strokeWidth={1.5} />,
    title: "Shake well.",
    description: "Gently shake the bottle to evenly blend the prepared solution before use.",
    label: "Shake",
  },
  {
    from: 0.805,
    to: 0.915,
    color: "#6F9685",
    num: "10",
    total: "11",
    icon: <SprayCan size={20} strokeWidth={1.5} />,
    title: "Ready to spray.",
    description: "Press the pump and release a fine mist around your surroundings.",
    label: "Spray",
  },
  {
    from: 0.915,
    to: 1.00,
    color: "#8B765D",
    num: "11",
    total: "11",
    icon: <Mountain size={20} strokeWidth={1.5} />,
    title: "Protection for every journey.",
    description: "Keep Chomm’s House close for everyday moments and outdoor adventures.",
    label: "Lifestyle",
  },
];

export default function Home() {
  return (
    <main className="bg-[#fbf9f6] min-h-screen font-serif text-[#3e3a35]">
      <ChommsHouse3DHero
        scrollHeight="1100vh"
        brand={
          <div className="flex items-center gap-2 text-[#3e3a35]">
            <span className="w-2 h-2 rounded-full bg-[#7FA39A]" />
            <span className="tracking-wide">Chomm’s House</span>
          </div>
        }
        navLinks={[
          { label: "Story", href: "#story" },
          { label: "How to Use", href: "#how-to-use" },
          { label: "Signature Scent", href: "#scent" },
          { label: "Lifestyle", href: "#lifestyle" },
        ]}
        ctaLabel="Explore"
        ctaHref="#how-to-use"
        title={
          <div className="flex flex-col items-center">
            <span className="text-[#3e3a35] text-5xl md:text-7xl font-semibold mb-2">Chomm’s House</span>
            <span className="text-[#7F9586] text-3xl md:text-5xl font-light italic">Natural Protection</span>
          </div>
        }
        subtitle={<p className="text-lg text-[#6e685f] mt-6">Scroll to experience the transformation.</p>}
        steps={steps}
      />
    </main>
  );
}
