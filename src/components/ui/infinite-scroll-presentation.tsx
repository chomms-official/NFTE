"use client";

import {
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SentScentLogo } from "./sent-scent-logo";

export interface PresentationStep {
  src: string;
  bg: string;
  title: string;
  date: string;
  overview: string;
}

interface InfiniteScrollPresentationProps {
  steps: PresentationStep[];
}

export const InfiniteScrollPresentation = ({ steps }: InfiniteScrollPresentationProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [isMobileState, setIsMobileState] = useState<boolean>(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      
      // Reduce sensitivity slightly for smoother reading
      const scrollDelta = e.deltaY * 0.0007;
      
      setScrollProgress((prev) => {
        let newProgress = prev + scrollDelta;
        
        // If scrolling down past the reading phase (progress > 1.8), go to next step
        if (newProgress > 1.8) {
          setCurrentStepIndex((idx) => (idx + 1) % steps.length);
          return 0; // Reset progress for the next image
        }
        
        // If scrolling up past the beginning (progress < 0), go to previous step
        if (newProgress < 0) {
          setCurrentStepIndex((idx) => (idx - 1 + steps.length) % steps.length);
          return 1.8; // Set to the end of the previous image
        }
        
        return newProgress;
      });
    };

    const handleTouchStart = (e: globalThis.TouchEvent) => {
      setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (!touchStartY) return;
      e.preventDefault();

      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      const scrollFactor = deltaY < 0 ? 0.006 : 0.004;
      const scrollDelta = deltaY * scrollFactor;
      
      setScrollProgress((prev) => {
        let newProgress = prev + scrollDelta;
        
        if (newProgress > 1.8) {
          setCurrentStepIndex((idx) => (idx + 1) % steps.length);
          return 0;
        }
        
        if (newProgress < 0) {
          setCurrentStepIndex((idx) => (idx - 1 + steps.length) % steps.length);
          return 1.8;
        }
        
        return newProgress;
      });

      setTouchStartY(touchY);
    };

    const handleTouchEnd = (): void => {
      setTouchStartY(0);
    };

    window.addEventListener("wheel", handleWheel as EventListener, { passive: false });
    window.addEventListener("touchstart", handleTouchStart as EventListener, { passive: false });
    window.addEventListener("touchmove", handleTouchMove as EventListener, { passive: false });
    window.addEventListener("touchend", handleTouchEnd as EventListener);

    return () => {
      window.removeEventListener("wheel", handleWheel as EventListener);
      window.removeEventListener("touchstart", handleTouchStart as EventListener);
      window.removeEventListener("touchmove", handleTouchMove as EventListener);
      window.removeEventListener("touchend", handleTouchEnd as EventListener);
    };
  }, [steps.length, touchStartY]);

  useEffect(() => {
    const checkIfMobile = (): void => {
      setIsMobileState(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const currentStep = steps[currentStepIndex];
  
  // Phase 1: 0 to 1 (Expansion)
  // Phase 2: 1 to 1.8 (Reading content)
  const expansionProgress = Math.min(Math.max(scrollProgress, 0), 1);
  const showContent = scrollProgress >= 1;
  const fadeOutProgress = Math.max(0, (scrollProgress - 1.5) / 0.3); // fade out right before transition

  const mediaWidth = 300 + expansionProgress * (isMobileState ? 650 : 1250);
  const mediaHeight = 400 + expansionProgress * (isMobileState ? 200 : 400);
  const textTranslateX = expansionProgress * (isMobileState ? 180 : 150);

  const firstWord = currentStep.title ? currentStep.title.split(" ")[0] : "";
  const restOfTitle = currentStep.title ? currentStep.title.split(" ").slice(1).join(" ") : "";

  return (
    <div
      ref={sectionRef}
      className="transition-colors duration-700 ease-in-out overflow-x-hidden fixed inset-0 w-full h-full bg-black z-50"
      style={{ opacity: 1 - fadeOutProgress }}
    >
      <div className="absolute top-8 left-8 z-[100] text-white">
        <SentScentLogo />
      </div>
      <section className="relative flex flex-col items-center justify-start min-h-[100dvh]">
        <div className="relative w-full flex flex-col items-center min-h-[100dvh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.bg}
              className="absolute inset-0 z-0 h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 - expansionProgress }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src={currentStep.bg}
                alt="Background"
                fill
                className="w-screen h-screen"
                style={{
                  objectFit: "cover",
                  objectPosition: "center",
                  filter: "blur(8px) brightness(0.6)"
                }}
                priority
              />
              <div className="absolute inset-0 bg-black/40" />
            </motion.div>
          </AnimatePresence>

          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-[100dvh] relative">
              <div
                className="absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-none rounded-2xl"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: "95vw",
                  maxHeight: "85vh",
                  boxShadow: "0px 20px 50px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div className="relative w-full h-full overflow-hidden rounded-2xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep.src}
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="w-full h-full"
                    >
                      <Image
                        src={currentStep.src}
                        alt={currentStep.title}
                        width={1280}
                        height={720}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </motion.div>
                  </AnimatePresence>

                  <motion.div
                    className="absolute inset-0 bg-black/60 rounded-xl"
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 0.7 - expansionProgress * 0.3 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                <div className="flex flex-col items-center text-center relative z-10 mt-4 transition-none">
                  {currentStep.date && (
                    <p
                      className="text-2xl text-blue-200"
                      style={{ transform: `translateX(-${textTranslateX}vw)` }}
                    >
                      {currentStep.date}
                    </p>
                  )}
                  <p
                    className="text-blue-200 font-medium text-center"
                    style={{ transform: `translateX(${textTranslateX}vw)` }}
                  >
                    Scroll down to explore
                  </p>
                </div>
              </div>

              <div
                className="flex items-center justify-center text-center gap-4 w-full relative z-10 transition-none flex-col mix-blend-normal"
              >
                <motion.h2
                  className="text-4xl md:text-5xl lg:text-7xl font-bold text-white transition-none drop-shadow-lg"
                  style={{ transform: `translateX(-${textTranslateX}vw)` }}
                >
                  {firstWord}
                </motion.h2>
                <motion.h2
                  className="text-4xl md:text-5xl lg:text-7xl font-bold text-center text-white transition-none drop-shadow-lg"
                  style={{ transform: `translateX(${textTranslateX}vw)` }}
                >
                  {restOfTitle}
                </motion.h2>
              </div>
            </div>

            <motion.section
              className="flex flex-col items-center text-center w-full max-w-4xl px-8 py-10 md:px-16 absolute bottom-[10%] left-1/2 transform -translate-x-1/2 z-20"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 50 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-black/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-4 text-white">
                  {currentStep.title}
                </h2>
                <p className="text-xl md:text-2xl text-zinc-200 font-medium leading-relaxed">
                  {currentStep.overview}
                </p>
                <div className="mt-6 text-sm text-zinc-400 animate-pulse">
                  Keep scrolling • Step {currentStepIndex + 1} of {steps.length}
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
};
