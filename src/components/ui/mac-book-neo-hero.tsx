"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

export type FrameSequenceStep = {
  from: number;
  to: number;
  color: string;
  num: string;
  total: string;
  icon?: React.ReactNode;
  image?: string;
  title: string;
  description: string;
  label: string;
};

export type FrameSequenceHeroProps = {
  heroImage: string;
  scrollHeight?: string;
  brand?: React.ReactNode;
  navLinks?: { label: string; href: string }[];
  ctaLabel?: string;
  ctaHref?: string;
  title: React.ReactNode;
  subtitle?: string;
  steps: FrameSequenceStep[];
  className?: string;
};

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

export function FrameSequenceHero({
  heroImage,
  scrollHeight = "400vh",
  brand,
  navLinks = [],
  ctaLabel,
  ctaHref = "#",
  title,
  subtitle,
  steps,
  className,
}: FrameSequenceHeroProps) {
  const spacerRef = useRef<HTMLDivElement | null>(null);

  const [navScrolled, setNavScrolled] = useState(false);
  const [subHidden, setSubHidden] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [progress, setProgress] = useState(0);
  const [stepLocal, setStepLocal] = useState(0);

  const onScroll = () => {
    const spacer = spacerRef.current;
    if (!spacer) return;
    const total = spacer.offsetHeight - window.innerHeight;
    const p = Math.max(0, Math.min(1, window.scrollY / Math.max(1, total)));
    
    setProgress(p);
    setNavScrolled(window.scrollY > 4);
    setSubHidden(window.scrollY > 8);
    let idx = -1;
    let local = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (p >= s.from && p < s.to) {
        idx = i;
        local = (p - s.from) / (s.to - s.from);
        break;
      }
    }
    setActiveIdx(idx);
    setStepLocal(Math.max(0, Math.min(1, local)));
  };

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps]);

  // Calculate parallax and scale for the hero image
  const imageScale = 1 + progress * 0.15;
  const imageY = progress * 10;

  return (
    <div className={cx("fsh-root", className)}>
      <nav className={cx("fsh-nav", navScrolled && "fsh-nav-scrolled")}>
        <div className="fsh-brand">{brand}</div>
        {navLinks.length > 0 && (
          <div className="fsh-nav-links">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href}>{l.label}</a>
            ))}
          </div>
        )}
        {ctaLabel && (
          <a href={ctaHref} className="fsh-cta">{ctaLabel}</a>
        )}
      </nav>

      {/* Pinned stage — always full viewport */}
      <div className="fsh-stage">
        <div className="fsh-canvas-wrap">
          <div className="w-full max-w-6xl mx-auto h-[70vh] relative rounded-3xl overflow-hidden shadow-2xl transition-transform duration-100 ease-out mt-24"
               style={{ 
                 transform: `scale(${imageScale}) translateY(${imageY}px)`,
                 boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
               }}>
            <img
              src={heroImage}
              alt="Product Showcase"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Elegant overlay gradient to make text pop */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#f7f5f2]/80"></div>
          </div>
        </div>

        <div className="fsh-copy mt-8">
          <h1 className="fsh-title drop-shadow-md">{title}</h1>
          {subtitle && (
            <p className={cx("fsh-sub", subHidden && "fsh-sub-hidden")}>{subtitle}</p>
          )}
        </div>

        <div className="fsh-cards">
          {steps.map((s, i) => {
            const isActive = activeIdx === i;
            const isPrev = activeIdx >= 0 && i < activeIdx;
            return (
              <article
                key={i}
                style={{ ["--c" as any]: s.color }}
                className={cx(
                  "fsh-card flex flex-col overflow-hidden",
                  isActive && "fsh-card-active",
                  isPrev && "fsh-card-prev"
                )}
              >
                {s.image && (
                  <div className="w-full h-32 overflow-hidden bg-gray-100 mb-4 rounded-xl">
                     <img src={s.image} alt={s.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                  </div>
                )}
                <div className="fsh-card-inner flex-1 flex flex-col">
                  <div className="fsh-card-head">
                    <span className="fsh-card-num">
                      <strong>{s.num}</strong> / {s.total}
                    </span>
                    <span aria-hidden className="fsh-card-icon text-xl">
                      {s.icon ?? "✦"}
                    </span>
                  </div>
                  <h3 className="fsh-card-title">{s.title}</h3>
                  <p className="fsh-card-desc flex-1">{s.description}</p>
                  <div className="fsh-card-foot mt-auto pt-4">
                    <div className="fsh-ticks">
                      {steps.map((_, j) => {
                        const done = j < activeIdx;
                        const cur = j === activeIdx;
                        return (
                          <i key={j} className="fsh-tick">
                            <span
                              style={{
                                transform: `scaleX(${done ? 1 : cur ? stepLocal : 0})`,
                                transition: done ? "none" : "transform 160ms linear",
                              }}
                            />
                          </i>
                        );
                      })}
                    </div>
                    <span className="fsh-card-label mt-2">{s.label}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="fsh-progress">
          <span className="fsh-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Empty scroll spacer: gives the page its scroll distance */}
      <div ref={spacerRef} className="fsh-spacer" style={{ height: scrollHeight }} />
    </div>
  );
}
