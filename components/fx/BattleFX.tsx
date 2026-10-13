"use client";

import { useEffect, useRef } from "react";

/**
 * Global visual-effects layer. Purely decorative: every overlay is
 * pointer-events:none and the page DOM is never touched (no attributes or
 * classes are added to page elements, so React hydration stays clean).
 * Reveal uses the Web Animations API; spotlight reads CSS vars from <html>.
 */

const REVEAL_SELECTOR = "main section, main article, main aside";
const INTERACTIVE_SELECTOR = "a, button, [role='button'], label, select, summary";

const REVEAL_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: "translateY(34px) scale(0.975)", filter: "blur(8px) brightness(1.8) saturate(0.4)", clipPath: "inset(0 0 100% 0)" },
  { offset: 0.55, filter: "blur(0px) brightness(1.15) saturate(1)" },
  { opacity: 1, transform: "none", filter: "none", clipPath: "inset(0 0 0% 0)" },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BattleFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const burstLayerRef = useRef<HTMLDivElement>(null);

  // Scroll reveal for sections / cards
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window) || !Element.prototype.animate) return;

    const seen = new WeakSet<Element>();
    let batch = 0;
    let batchReset: number | undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          el.animate(REVEAL_KEYFRAMES, {
            duration: 820,
            delay: Math.min(batch++, 6) * 70,
            easing: "cubic-bezier(.16,.84,.24,1)",
            fill: "backwards",
          });
        }
        window.clearTimeout(batchReset);
        batchReset = window.setTimeout(() => (batch = 0), 200);
      },
      { rootMargin: "0px 0px 8% 0px", threshold: 0 },
    );

    function arm(root: ParentNode) {
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (getComputedStyle(el).position === "fixed") return;
        io.observe(el);
      });
    }

    arm(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const el = node as HTMLElement;
          if (el.matches(REVEAL_SELECTOR)) arm(el.parentNode || document);
          else arm(el);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(batchReset);
    };
  }, []);

  // Cursor reticle, card spotlight and click "muzzle flash"
  useEffect(() => {
    const root = document.documentElement;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = prefersReducedMotion();
    const reticle = reticleRef.current;
    const burstLayer = burstLayerRef.current;

    let tx = -100;
    let ty = -100;
    let x = -100;
    let y = -100;
    let raf = 0;

    if (finePointer) root.setAttribute("data-fx-cursor", "on");

    function loop() {
      x += (tx - x) * 0.28;
      y += (ty - y) * 0.28;
      if (reticle) reticle.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    }
    if (finePointer && reticle) raf = requestAnimationFrame(loop);

    function onMove(e: PointerEvent) {
      tx = e.clientX;
      ty = e.clientY;
      root.style.setProperty("--fx-mx", `${e.clientX}px`);
      root.style.setProperty("--fx-my", `${e.clientY}px`);

      if (reticle) {
        const target = e.target as Element | null;
        reticle.toggleAttribute("data-lock", Boolean(target?.closest?.(INTERACTIVE_SELECTOR)));
        reticle.removeAttribute("data-hidden");
      }
    }

    function onLeave() {
      reticle?.setAttribute("data-hidden", "");
    }

    function onDown(e: PointerEvent) {
      if (reduced || !burstLayer) return;
      const target = e.target as Element | null;
      const interactive = Boolean(target?.closest?.(INTERACTIVE_SELECTOR));

      const burst = document.createElement("span");
      burst.className = `bb-fx-burst${interactive ? " is-hot" : ""}`;
      burst.style.left = `${e.clientX}px`;
      burst.style.top = `${e.clientY}px`;
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("i");
        s.style.setProperty("--a", `${i * 45 + Math.random() * 20}deg`);
        s.style.setProperty("--d", `${26 + Math.random() * 22}px`);
        burst.appendChild(s);
      }
      burstLayer.appendChild(burst);
      window.setTimeout(() => burst.remove(), 650);

      reticle?.setAttribute("data-fire", "");
      window.setTimeout(() => reticle?.removeAttribute("data-fire"), 140);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerleave", onLeave);
      root.removeAttribute("data-fx-cursor");
    };
  }, []);

  // Floating embers / dust
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;

    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number };
    const particles: P[] = [];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(initial = false): P {
      const max = 380 + Math.random() * 520;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 10,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.18 + Math.random() * 0.55),
        r: 0.6 + Math.random() * 1.8,
        life: initial ? Math.random() * max : 0,
        max,
        hue: Math.random() < 0.78 ? 78 : 32, // lime / ember amber
      };
    }

    resize();
    const count = w < 640 ? 22 : 48;
    for (let i = 0; i < count; i++) particles.push(spawn(true));

    function frame() {
      if (!running) return;
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + Math.sin((p.life + i * 40) / 60) * 0.15;
        p.y += p.vy;
        if (p.life > p.max || p.y < -10) {
          particles[i] = spawn();
          continue;
        }
        const alpha = Math.sin(Math.PI * (p.life / p.max)) * 0.75;
        ctx!.beginPath();
        ctx!.fillStyle = `hsla(${p.hue}, 100%, 58%, ${alpha})`;
        ctx!.shadowColor = `hsla(${p.hue}, 100%, 55%, ${alpha})`;
        ctx!.shadowBlur = 8;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onVis() {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div aria-hidden="true" className="bb-fx-root">
      <canvas ref={canvasRef} className="bb-fx-embers" />
      <div className="bb-fx-radar" />
      <div className="bb-fx-scan" />
      <div className="bb-fx-grain" />
      <div className="bb-fx-vignette" />
      <div ref={burstLayerRef} className="bb-fx-bursts" />
      <div ref={reticleRef} className="bb-fx-reticle" data-hidden="">
        <span />
      </div>
    </div>
  );
}
