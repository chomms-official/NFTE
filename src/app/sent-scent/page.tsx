"use client";

import { InfiniteScrollPresentation, PresentationStep } from "@/components/ui/infinite-scroll-presentation";

const presentationSteps: PresentationStep[] = [
  {
    src: "/presentation/step1.jpg",
    bg: "/presentation/step1.jpg",
    title: "Earl Grey Garden",
    date: "Step 01",
    overview: "We use our 'Earl Grey Garden' blend with 63% active mosquito-repelling oils.",
  },
  {
    src: "/presentation/step2.jpg",
    bg: "/presentation/step2.jpg",
    title: "Natural Shell",
    date: "Step 02",
    overview: "Protected by a natural shell to lock in volatile oils and allow controlled release.",
  },
  {
    src: "/presentation/step3.jpg",
    bg: "/presentation/step3.jpg",
    title: "Stable Powder",
    date: "Step 03",
    overview: "Converted into a stable, dry powder and formed into compact 5x5 cm films.",
  },
  {
    src: "/presentation/step4.jpg",
    bg: "/presentation/step4.jpg",
    title: "Dissolve & Pour",
    date: "Step 04",
    overview: "Just dissolve 1 film in water and pour it into your favorite spray bottle.",
  },
  {
    src: "/asset_spray.jpg",
    bg: "/asset_spray.jpg",
    title: "Ready to Use",
    date: "Step 05",
    overview: "Your natural mosquito repellent spray is fully prepared and ready to use!",
  },
];

export default function PresentationPage() {
  return (
    <main className="w-full min-h-screen bg-black">
      <InfiniteScrollPresentation steps={presentationSteps} />
    </main>
  );
}
