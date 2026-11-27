import { useEffect, useRef } from 'react';
import { PALETTE } from '../game/mudras';

interface CelebrationOverlayProps {
  active: boolean;
}

interface PetalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  color: string;
  shape: 'petal' | 'diamond' | 'circle';
  opacity: number;
}

const COLORS = [
  PALETTE.gold,
  PALETTE.crimson,
  PALETTE.amber,
  '#FDE68A',
  '#DC2626',
  '#FFF8EA',
];

/**
 * Zero-dependency HTML5 2D Canvas celebration animation (lotus petals & confetti)
 * displayed when the player completes the 7-mudra Finale.
 */
export function CelebrationOverlay({ active }: CelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const shapes: Array<PetalParticle['shape']> = ['petal', 'diamond', 'circle'];
    const particles: PetalParticle[] = Array.from({ length: 78 }, (_, idx) => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.85,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1.5 + Math.random() * 2.4,
      size: 7 + Math.random() * 9,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      color: COLORS[idx % COLORS.length],
      shape: shapes[idx % shapes.length],
      opacity: 0.78 + Math.random() * 0.22,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx + Math.sin(p.y * 0.015 + p.angle) * 0.65;
        p.y += p.vy;
        p.angle += p.spin;

        if (p.y > height + 30) {
          p.y = -24;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'petal') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(p.size * 0.75, 0, 0, p.size);
          ctx.quadraticCurveTo(-p.size * 0.75, 0, 0, -p.size);
          ctx.fill();
        } else if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.8);
          ctx.lineTo(p.size * 0.6, 0);
          ctx.lineTo(0, p.size * 0.8);
          ctx.lineTo(-p.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[55]"
    />
  );
}
