"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ──────────────────────────────────────────────────────────
   CinematicScrollHero
   A scroll-driven cinematic animation that smoothly transitions
   between product journey stages with zoom, pan, crossfade,
   parallax, and particle effects — feeling like watching a video.
   ────────────────────────────────────────────────────────── */

interface Stage {
  image: string;
  /** Scroll range [0‒1] this stage occupies */
  from: number;
  to: number;
  /** Start/end transforms applied via interpolation */
  startScale: number;
  endScale: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  startRotate?: number;
  endRotate?: number;
  /** Info card */
  num: string;
  title: string;
  description: string;
  label: string;
  color: string;
}

const stages: Stage[] = [
  {
    image: "/frame_hero.jpg",
    from: 0,
    to: 0.15,
    startScale: 1,
    endScale: 1.15,
    startX: 0,
    endX: 0,
    startY: 0,
    endY: -5,
    num: "",
    title: "",
    description: "",
    label: "",
    color: "#8b7d6b",
  },
  {
    image: "/frame_step1.jpg",
    from: 0.15,
    to: 0.35,
    startScale: 1.05,
    endScale: 1.2,
    startX: 5,
    endX: -3,
    startY: 3,
    endY: -2,
    startRotate: -1,
    endRotate: 1,
    num: "01",
    title: "Take out the film sheet",
    description:
      "Small film. Big protection. A natural mosquito repellent film — DEET Free, safe for your skin, portable for your everyday adventures.",
    label: "THE FILM",
    color: "#8b7d6b",
  },
  {
    image: "/frame_step2.jpg",
    from: 0.35,
    to: 0.55,
    startScale: 1.1,
    endScale: 1.25,
    startX: -4,
    endX: 4,
    startY: 2,
    endY: -3,
    startRotate: 0.5,
    endRotate: -0.5,
    num: "02",
    title: "Dissolve in water",
    description:
      "Drop the film into a glass of water. Watch it dissolve naturally, releasing a blend of Tangerine, Kaffir Lime, Eucalyptus & Cedarwood essential oils.",
    label: "DISSOLVE",
    color: "#7ca856",
  },
  {
    image: "/frame_step3.jpg",
    from: 0.55,
    to: 0.75,
    startScale: 1.0,
    endScale: 1.18,
    startX: 3,
    endX: -2,
    startY: -2,
    endY: 2,
    startRotate: -0.3,
    endRotate: 0.8,
    num: "03",
    title: "Pour into spray bottle",
    description:
      "Pour the dissolved solution into the portable spray bottle. Your natural repellent is almost ready.",
    label: "PREPARE",
    color: "#e6a817",
  },
  {
    image: "/frame_step4.jpg",
    from: 0.75,
    to: 0.95,
    startScale: 1.05,
    endScale: 1.3,
    startX: -2,
    endX: 5,
    startY: 1,
    endY: -4,
    startRotate: 0,
    endRotate: -1,
    num: "04",
    title: "Shake & Spray",
    description:
      "Shake well and spray. Enjoy 4+ hours of natural mosquito protection with our signature scent. Safe for the whole family.",
    label: "PROTECT",
    color: "#4a4135",
  },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/* Smooth easing for more organic motion */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CinematicScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const totalScroll = el.offsetHeight - window.innerHeight;
    const raw = window.scrollY / Math.max(1, totalScroll);
    setProgress(clamp01(raw));
    setNavScrolled(window.scrollY > 20);
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

  /* Determine active stage & compute per-stage local progress */
  let activeIdx = 0;
  let localT = 0;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (progress >= s.from && progress < s.to) {
      activeIdx = i;
      localT = clamp01((progress - s.from) / (s.to - s.from));
      break;
    }
    if (progress >= s.to) activeIdx = i;
  }
  if (progress >= stages[stages.length - 1].to) {
    activeIdx = stages.length - 1;
    localT = 1;
  }

  const easedT = easeInOutCubic(localT);

  /* Current active stage */
  const cur = stages[activeIdx];
  const curScale = lerp(cur.startScale, cur.endScale, easedT);
  const curX = lerp(cur.startX, cur.endX, easedT);
  const curY = lerp(cur.startY, cur.endY, easedT);
  const curRotate = lerp(cur.startRotate ?? 0, cur.endRotate ?? 0, easedT);

  /* Active card (skip stage 0 which is the intro) */
  const cardStage = activeIdx >= 1 ? stages[activeIdx] : null;

  return (
    <div ref={containerRef} className="relative" style={{ height: "500vh" }}>
      {/* ── NAV ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 transition-all duration-300 ${
          navScrolled
            ? "py-3 bg-white/90 backdrop-blur-lg shadow-sm"
            : "py-5 bg-transparent"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-lg text-[#4a4135]">
          <span className="w-2 h-2 rounded-full bg-[#8b7d6b] inline-block" />
          Chomm's House
        </div>
        <div className="hidden md:flex gap-8 text-sm text-[#888]">
          <a href="#" className="hover:text-[#333] transition-colors">Overview</a>
          <a href="#" className="hover:text-[#333] transition-colors">Ingredients</a>
          <a href="#" className="hover:text-[#333] transition-colors">How to use</a>
          <a href="#" className="hover:text-[#333] transition-colors">Shop</a>
        </div>
        <a href="#" className="bg-[#4a4135] text-white px-5 py-2 rounded-full text-sm hover:bg-[#332d24] transition-colors">
          Buy Now
        </a>
      </nav>

      {/* ── STICKY VIEWPORT ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-white">
        {/* ── IMAGE LAYERS ── */}
        {stages.map((stage, i) => {
          /* Compute this layer's opacity for crossfade */
          let opacity = 0;
          if (i === activeIdx) {
            // Current stage: fade in during first 15% of local progress, stay at 1
            opacity = clamp01(localT / 0.15);
          } else if (i === activeIdx - 1) {
            // Previous stage: fade out during first 15% of next stage's local progress
            opacity = 1 - clamp01(localT / 0.15);
          } else if (i < activeIdx) {
            opacity = 0;
          }

          /* Per-layer transform: if it's the active one, use computed values;
             otherwise freeze at its end state */
          let scale = stage.endScale;
          let x = stage.endX;
          let y = stage.endY;
          let rotate = stage.endRotate ?? 0;

          if (i === activeIdx) {
            scale = curScale;
            x = curX;
            y = curY;
            rotate = curRotate;
          }

          return (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity,
                transition: "opacity 0.08s linear",
                zIndex: i === activeIdx ? 2 : 1,
                willChange: "opacity",
              }}
            >
              <img
                src={stage.image}
                alt=""
                draggable={false}
                className="max-w-[85%] max-h-[75vh] object-contain select-none"
                style={{
                  transform: `scale(${scale}) translate(${x}%, ${y}%) rotate(${rotate}deg)`,
                  transition: "transform 0.06s linear",
                  willChange: "transform",
                  filter: `brightness(${1 + (i === activeIdx ? localT * 0.03 : 0)})`,
                }}
              />
            </div>
          );
        })}

        {/* ── VIGNETTE / GRADIENT OVERLAY ── */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(255,255,255,0.7) 100%)`,
          }}
        />

        {/* ── TITLE (fades out as you scroll) ── */}
        <div
          className="absolute top-[12vh] left-0 w-full text-center z-20 pointer-events-none"
          style={{
            opacity: clamp01(1 - progress * 8),
            transform: `translateY(${progress * -80}px)`,
            transition: "opacity 0.1s, transform 0.1s",
          }}
        >
          <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-light tracking-tight leading-none">
            <span className="text-[#333]">Mosquito </span>
            <span className="text-[#8b7d6b]">Repellent Film</span>
          </h1>
          <p className="mt-3 text-[#999] text-lg tracking-wide">
            Scroll to explore natural protection
          </p>
        </div>

        {/* ── INFO CARD (left side) ── */}
        {cardStage && (
          <div
            className="absolute left-[5%] md:left-[8%] top-1/2 -translate-y-1/2 z-30 w-[320px] md:w-[360px]"
            style={{
              opacity: clamp01(localT / 0.1) * clamp01((1 - localT) / 0.1),
              transform: `translateY(${-50 + lerp(15, -15, easedT)}px)`,
              transition: "opacity 0.12s, transform 0.12s",
            }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/[0.03]">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-[#888] tracking-widest font-medium">
                  <strong className="text-[#111] text-base">{cardStage.num}</strong>{" "}
                  / 04
                </span>
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: cardStage.color + "18", color: cardStage.color }}
                >
                  ✦
                </span>
              </div>
              <h3
                className="text-2xl font-medium mb-3 leading-tight"
                style={{ color: cardStage.color }}
              >
                {cardStage.title}
              </h3>
              <p className="text-[#666] text-[0.95rem] leading-relaxed mb-6">
                {cardStage.description}
              </p>
              {/* Progress ticks */}
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex-1 h-[3px] rounded-full bg-[#eee] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: cardStage.color,
                        width:
                          n < activeIdx
                            ? "100%"
                            : n === activeIdx
                            ? `${localT * 100}%`
                            : "0%",
                        transition: "width 0.15s linear",
                      }}
                    />
                  </div>
                ))}
              </div>
              <span className="text-xs text-[#888] font-semibold tracking-widest uppercase">
                {cardStage.label}
              </span>
            </div>
          </div>
        )}

        {/* ── BOTTOM PROGRESS BAR ── */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f0f0f0] z-30">
          <div
            className="h-full bg-[#8b7d6b]"
            style={{ width: `${progress * 100}%`, transition: "width 0.06s linear" }}
          />
        </div>

        {/* ── AMBIENT FLOATING PARTICLES ── */}
        <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-[0.12]"
              style={{
                width: `${4 + i * 2}px`,
                height: `${4 + i * 2}px`,
                background: "#8b7d6b",
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                transform: `translateY(${Math.sin(progress * Math.PI * 2 + i) * 30}px)`,
                transition: "transform 0.2s ease-out",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
