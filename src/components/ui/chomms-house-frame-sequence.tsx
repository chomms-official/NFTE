"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type FrameSequenceStep = {
  from: number; to: number; color: string; num: string; total: string;
  icon?: React.ReactNode; title: string; description: string; label: string;
};

export type FrameSequenceHeroProps = {
  frameCount: number;
  framePath: (i: number) => string;
  fallbackFrames: string[];
  eagerCount?: number;
  scrollHeight?: string;
  brand?: React.ReactNode;
  navLinks?: { label: string; href: string }[];
  ctaLabel?: string; ctaHref?: string;
  title: React.ReactNode; subtitle?: string;
  steps: FrameSequenceStep[];
  className?: string;
};

const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(" ");
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function FrameSequenceHero({
  frameCount, framePath, fallbackFrames, eagerCount = 100,
  scrollHeight = "1100vh", brand, navLinks = [], ctaLabel,
  ctaHref = "#", title, subtitle, steps, className,
}: FrameSequenceHeroProps) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const rafRef = useRef(false);
  const failedRef = useRef<Set<number>>(new Set());

  const [mode, setMode] = useState<"fallback" | "3d">("fallback");
  const [probeDone, setProbeDone] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [loaderDone, setLoaderDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [stepLocal, setStepLocal] = useState(0);
  const [src, setSrc] = useState(fallbackFrames[0] ?? "");
  const [blendSrc, setBlendSrc] = useState(fallbackFrames[1] ?? fallbackFrames[0] ?? "");
  const [blend, setBlend] = useState(0);

  const stepIndexFor = useCallback((p: number) => {
    for (let i = 0; i < steps.length; i++) {
      if (p >= steps[i].from && p < steps[i].to) return i;
    }
    return Math.max(0, steps.length - 1);
  }, [steps]);

  const updateFallback = useCallback((idx: number, local: number) => {
    const a = fallbackFrames[idx] ?? fallbackFrames[fallbackFrames.length - 1] ?? "";
    const bIdx = Math.min(idx + 1, fallbackFrames.length - 1);
    const b = fallbackFrames[bIdx] ?? a;
    setSrc(a); setBlendSrc(b);
    setBlend(bIdx === idx ? 0 : clamp((local - 0.72) / 0.28));
  }, [fallbackFrames]);

  // Smart detection: one HEAD request only, so a missing 3D sequence never causes 900 failures.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(framePath(1), { method: "HEAD", cache: "no-store" });
        if (!cancelled && r.ok) setMode("3d");
      } catch { /* fallback is expected */ }
      finally { if (!cancelled) setProbeDone(true); }
    })();
    return () => { cancelled = true; };
  }, [framePath]);

  // Preload only after the 3D sequence has been detected.
  useEffect(() => {
    if (mode !== "3d") return;
    let cancelled = false;
    let settled = 0;
    const eager = Math.min(eagerCount, frameCount);

    const load = (i: number) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        settled++;
        setLoadPct(Math.round((settled / eager) * 100));
        if (settled >= eager) setLoaderDone(true);
      };
      img.onerror = () => {
        failedRef.current.add(i);
        if (cancelled) return;
        settled++;
        setLoadPct(Math.round((settled / eager) * 100));
        if (settled >= eager) setLoaderDone(true);
      };
      img.src = framePath(i + 1);
    };
    for (let i = 0; i < eager; i++) load(i);
    return () => { cancelled = true; };
  }, [mode, eagerCount, frameCount, framePath]);

  // Once 3D exists, jump to the current scroll position immediately.
  useEffect(() => {
    if (mode !== "3d") return;
    const p = progress;
    const i = Math.round(p * (frameCount - 1));
    setSrc(framePath(i + 1));
  }, [mode, progress, frameCount, framePath]);

  const showFrame = useCallback((i: number) => {
    if (failedRef.current.has(i)) {
      const p = i / Math.max(1, frameCount - 1);
      setSrc(fallbackFrames[stepIndexFor(p)] ?? fallbackFrames[0] ?? "");
      return;
    }
    setSrc(framePath(i + 1));
  }, [fallbackFrames, frameCount, framePath, stepIndexFor]);

  const animate = useCallback(() => {
    if (rafRef.current || mode !== "3d") return;
    rafRef.current = true;
    const tick = () => {
      const diff = targetRef.current - displayRef.current;
      displayRef.current = Math.abs(diff) < 0.08
        ? targetRef.current
        : displayRef.current + diff * 0.28;
      showFrame(clamp(Math.round(displayRef.current), 0, frameCount - 1));
      if (displayRef.current !== targetRef.current) requestAnimationFrame(tick);
      else rafRef.current = false;
    };
    requestAnimationFrame(tick);
  }, [frameCount, mode, showFrame]);

  const onScroll = useCallback(() => {
    const spacer = spacerRef.current;
    if (!spacer) return;
    const total = Math.max(1, spacer.offsetHeight - window.innerHeight);
    const p = clamp(window.scrollY / total);
    const idx = stepIndexFor(p);
    const s = steps[idx];
    const local = clamp((p - s.from) / Math.max(0.0001, s.to - s.from));

    targetRef.current = p * (frameCount - 1);
    setProgress(p); setActiveIdx(idx); setStepLocal(local);

    if (mode === "3d") animate();
    else updateFallback(idx, local);
  }, [animate, frameCount, mode, stepIndexFor, steps, updateFallback]);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  const currentStep = steps[activeIdx] ?? steps[0];

  return (
    <div className={cx("ch-root", className)}>
      <div className={cx(
        "ch-loader",
        ((mode === "3d" && loaderDone) || (mode === "fallback" && probeDone)) && "ch-loader-done"
      )}>
        <div className="ch-loader-text">
          {mode === "3d" ? (loaderDone ? "Ready" : `Preparing your journey · ${loadPct}%`)
                         : "Preparing your journey"}
        </div>
        <div className="ch-loader-track"><span className="ch-loader-fill"
          style={{ width: `${mode === "3d" ? loadPct : probeDone ? 100 : 45}%` }} /></div>
        <div className="ch-loader-mode">
          {mode === "3d" ? "3D sequence" : "Storyboard preview"}
        </div>
      </div>

      <nav className="ch-nav">
        <div className="ch-brand">{brand}</div>
        <div className="ch-nav-links">
          {navLinks.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
        </div>
        {ctaLabel && <a className="ch-cta" href={ctaHref}>{ctaLabel}</a>}
      </nav>

      <div className="ch-stage">
        <div className="ch-canvas-wrap">
          {mode === "3d" ? (
            <img key={src} src={src} alt="" className="ch-canvas" draggable={false}
              onError={() => {
                const i = Math.round(targetRef.current);
                failedRef.current.add(i);
                const p = i / Math.max(1, frameCount - 1);
                setSrc(fallbackFrames[stepIndexFor(p)] ?? fallbackFrames[0] ?? "");
              }} />
          ) : (
            <>
              <img src={src} alt={`Chomm’s House — ${currentStep.label}`} className="ch-canvas ch-fallback-primary"
                style={{ transform: `scale(${1.015 + stepLocal * 0.025})` }} draggable={false} />
              {blendSrc && blendSrc !== src && (
                <img src={blendSrc} alt="" aria-hidden className="ch-canvas ch-fallback-secondary"
                  style={{ opacity: blend, transform: `scale(${1.03 + stepLocal * 0.02})` }} draggable={false} />
              )}
              <div className="ch-fallback-vignette" aria-hidden />
            </>
          )}
        </div>

        <div className="ch-copy">
          <h1 className="ch-title">{title}</h1>
          {subtitle && <p className={cx("ch-sub", progress > 0.02 && "ch-sub-hidden")}>{subtitle}</p>}
        </div>

        <div className="ch-card-wrap">
          {steps.map((s, i) => (
            <article key={s.num} className={cx("ch-card", i === activeIdx && "ch-card-active")}
              style={{ ["--c" as any]: s.color }} aria-hidden={i !== activeIdx}>
              <div className="ch-card-inner">
                <div className="ch-card-head">
                  <span className="ch-card-num"><strong>{s.num}</strong> / {s.total}</span>
                  <span className="ch-card-icon">{s.icon ?? "✦"}</span>
                </div>
                <h2 className="ch-card-title">{s.title}</h2>
                <p className="ch-card-desc">{s.description}</p>
                <div className="ch-card-foot">
                  <div className="ch-ticks">
                    {steps.map((_, j) => (
                      <i className="ch-tick" key={j}>
                        <span style={{ transform: `scaleX(${j < activeIdx ? 1 : j === activeIdx ? stepLocal : 0})` }} />
                      </i>
                    ))}
                  </div>
                  <span className="ch-card-label">{s.label}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="ch-progress"><span style={{ width: `${progress * 100}%` }} /></div>
        <div className="ch-step-badge">{String(activeIdx + 1).padStart(2, "0")} <i/> {String(steps.length).padStart(2, "0")}</div>
      </div>

      <div ref={spacerRef} className="ch-spacer" style={{ height: scrollHeight }} />
    </div>
  );
}
