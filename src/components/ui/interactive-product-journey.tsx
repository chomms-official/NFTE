"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function InteractiveProductJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const totalScroll = el.offsetHeight - window.innerHeight;
    const raw = window.scrollY / Math.max(1, totalScroll);
    setProgress(clamp(raw, 0, 1));
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  /* 
   * ANIMATION MATH
   */

  // 1. POUCH (0.0 -> 0.25)
  // Moves up and fades out
  const p1 = clamp(progress / 0.25, 0, 1);
  const pouchY = p1 * -100;
  const pouchOpacity = progress > 0.25 ? 0 : 1;

  // 1.5 FILM (0.0 -> 0.4)
  // Comes out of pouch, drops into water
  const filmP1 = clamp(progress / 0.15, 0, 1);
  const filmP2 = clamp((progress - 0.15) / 0.15, 0, 1);
  const filmY = filmP1 * 10 + filmP2 * 30; // comes out, then drops down
  const filmX = filmP1 * 10;
  const filmRotate = filmP1 * 15;
  const filmOpacity = progress > 0.35 ? 1 - clamp((progress - 0.35) / 0.05, 0, 1) : 1;

  // 2. GLASS (0.15 -> 0.6)
  // Rises up, catches film, then rotates to pour
  const gP1 = clamp((progress - 0.15) / 0.15, 0, 1); // rising
  const gP2 = clamp((progress - 0.4) / 0.2, 0, 1); // pouring
  const glassY = (1 - easeOut(gP1)) * 50 + easeOut(gP2) * -30;
  const glassX = easeOut(gP2) * 15;
  const glassRotate = easeOut(gP2) * 60;
  const glassOpacity = progress < 0.15 ? 0 : progress > 0.65 ? 0 : 1;

  // 3. BOTTLE (0.35 -> 0.75)
  // Rises up to receive water, then moves center
  const bP1 = clamp((progress - 0.35) / 0.15, 0, 1);
  const bP2 = clamp((progress - 0.6) / 0.15, 0, 1);
  const bottleY = (1 - easeOut(bP1)) * 50;
  const bottleX = (1 - easeOut(bP2)) * -15; // starts left, moves center
  const bottleOpacity = progress < 0.35 ? 0 : progress > 0.75 ? 0 : 1;

  // 4. SPRAY HAND (0.7 -> 1.0)
  const sP1 = clamp((progress - 0.7) / 0.3, 0, 1);
  const sprayY = (1 - easeOut(sP1)) * 20;
  const sprayScale = 1 + easeOut(sP1) * 0.1;
  const sprayOpacity = progress < 0.7 ? 0 : 1;

  // 4.5 WATER STREAM (0.45 -> 0.6)
  const wP = clamp((progress - 0.45) / 0.15, 0, 1);
  const streamHeight = easeOut(wP) * 150;
  const streamOpacity = wP > 0 && wP < 1 ? 1 : 0;

  // TEXT
  let title = "The Natural Journey";
  let desc = "Scroll down to see the magic happen.";
  if (progress > 0.1 && progress <= 0.3) {
    title = "1. Take out the film";
    desc = "Small film. Big protection.";
  } else if (progress > 0.3 && progress <= 0.5) {
    title = "2. Dissolve in water";
    desc = "Watch it seamlessly melt into liquid form.";
  } else if (progress > 0.5 && progress <= 0.75) {
    title = "3. Pour into bottle";
    desc = "Prepare your personal mosquito repellent.";
  } else if (progress > 0.75) {
    title = "4. Shake & Spray";
    desc = "Protection in every journey.";
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "400vh", backgroundColor: "#f3eee7" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">

        {/* Text Overlay */}
        <div className="absolute top-[10vh] w-full text-center z-50">
          <h2 className="text-4xl md:text-5xl font-light text-[#4a4135] transition-all duration-300">
            {title}
          </h2>
          <p className="mt-4 text-[#8b7d6b] text-lg max-w-md mx-auto transition-all duration-300">
            {desc}
          </p>
        </div>

        {/* 1. POUCH */}
        <img 
          src="/asset_pouch.jpg" 
          alt="Pouch"
          className="absolute max-h-[60vh] md:max-h-[70vh] object-contain z-10"
          style={{
            transform: `translateY(${pouchY}vh)`,
            opacity: pouchOpacity,
            mixBlendMode: 'multiply',
            willChange: "transform, opacity"
          }}
        />

        {/* 1.5 FILM */}
        <div 
          className="absolute w-[18vh] h-[15vh] bg-white/60 backdrop-blur-sm rounded border border-white/50 shadow-lg z-20"
          style={{
            transform: `translate(${filmX}vw, ${filmY}vh) rotate(${filmRotate}deg)`,
            opacity: filmOpacity,
            willChange: "transform, opacity",
            display: progress > 0.4 ? "none" : "block"
          }}
        />

        {/* 2. GLASS */}
        <img 
          src="/asset_glass.jpg" 
          alt="Glass"
          className="absolute max-h-[35vh] object-contain z-30"
          style={{
            transform: `translate(${glassX}vw, ${glassY}vh) rotate(${glassRotate}deg)`,
            opacity: glassOpacity,
            mixBlendMode: 'multiply',
            willChange: "transform, opacity",
            display: progress > 0.7 ? "none" : "block"
          }}
        />

        {/* 4.5 WATER STREAM (connecting glass to bottle) */}
        <div 
          className="absolute w-[8px] bg-gradient-to-b from-blue-100/40 to-blue-300/20 rounded-full blur-[1px] z-20"
          style={{
            height: `${streamHeight}px`,
            top: '55%',
            left: '48%',
            opacity: streamOpacity,
            transform: `rotate(-15deg)`,
            transformOrigin: 'top center',
            display: progress > 0.7 ? "none" : "block"
          }}
        />

        {/* 3. BOTTLE */}
        <img 
          src="/asset_bottle.jpg" 
          alt="Bottle"
          className="absolute max-h-[50vh] object-contain z-10"
          style={{
            transform: `translate(${bottleX}vw, ${bottleY}vh)`,
            opacity: bottleOpacity,
            mixBlendMode: 'multiply',
            willChange: "transform, opacity",
            display: progress > 0.8 ? "none" : "block"
          }}
        />

        {/* 4. SPRAY HAND */}
        <img 
          src="/asset_spray_clean.jpg" 
          alt="Spray"
          className="absolute max-h-[70vh] object-contain z-40 origin-bottom"
          style={{
            transform: `translateY(${sprayY}vh) scale(${sprayScale})`,
            opacity: sprayOpacity,
            mixBlendMode: 'multiply',
            willChange: "transform, opacity",
            display: progress < 0.6 ? "none" : "block"
          }}
        />

        {/* SPRAY PARTICLES */}
        {progress > 0.8 && (
          <div 
            className="absolute z-50 pointer-events-none"
            style={{
              top: '40%',
              left: '35%',
              width: '30vw',
              height: '30vh',
            }}
          >
            {[...Array(20)].map((_, i) => {
              // Calculate continuous particle loop based on progress and time
              const offset = (progress * 10 + i * 0.1) % 1;
              return (
                <div 
                  key={i}
                  className="absolute rounded-full bg-white blur-[2px]"
                  style={{
                    width: `${4 + Math.random() * 6}px`,
                    height: `${4 + Math.random() * 6}px`,
                    left: `${offset * 100}%`,
                    top: `${40 + (Math.sin(offset * Math.PI) * 50) * (Math.random() > 0.5 ? 1 : -1)}%`,
                    opacity: 1 - offset,
                    transform: `scale(${1 + offset})`,
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
