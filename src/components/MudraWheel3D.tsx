import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MUDRAS,
  SECTOR_ANGLE,
  SECTOR_COUNT,
  TWO_PI,
  computeTargetSpinRotation,
  getSectorIndexAtRotation,
} from '../game/mudras';
import { MudraSpriteAsset } from '../game/mudraSprites';
import { mudraAudio } from '../game/audio';

export interface MudraWheelHandle {
  spinTo: (targetSectorIndex: number, durationMs: number) => void;
}

interface MudraWheel3DProps {
  canSpin: boolean;
  canRecordSpin: boolean;
  isSpinning: boolean;
  onWheelClick: () => void;
  onManualSpinStart?: () => void;
  onSpinInterrupt?: () => void;
  onSpinComplete: (verifiedSectorIndex: number) => void;
  highlightFinale: boolean;
  mudraSprites: Record<number, MudraSpriteAsset>;
}

const WHEEL_RADIUS = 2.66;

/**
 * Draws a crisp curved text label centered along the top arc of a sector
 * (reading left-to-right upright when the sector sits at 12 o'clock).
 */
function drawCurvedSectorLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  textHex: string,
) {
  const upperText = text.toUpperCase();
  const maxArcAngle = SECTOR_ANGLE * 0.86;
  const letterSpacing = 3;
  const chars = Array.from(upperText);

  let fontSize = 54;
  let widths: number[] = [];
  let totalWidth = 0;

  while (fontSize >= 26) {
    ctx.font = `800 ${fontSize}px "Avenir Next", "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
    widths = chars.map((ch) => ctx.measureText(ch).width);
    totalWidth = widths.reduce((sum, w) => sum + w, 0) + letterSpacing * Math.max(0, chars.length - 1);
    if (totalWidth / radius <= maxArcAngle) break;
    fontSize -= 2;
  }

  const totalAngle = totalWidth / radius;
  let currentAngle = -totalAngle / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const isLightText = textHex === '#FFFFFF' || textHex === '#FDE68A';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const charArc = (widths[i] + (i < chars.length - 1 ? letterSpacing : 0)) / radius;
    const midAngle = currentAngle + widths[i] / (2 * radius);

    ctx.save();
    ctx.rotate(midAngle);

    if (isLightText) {
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(43, 5, 8, 0.82)';
      ctx.strokeText(ch, 0, -radius);
    } else {
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(255, 248, 234, 0.82)';
      ctx.strokeText(ch, 0, -radius);
    }

    ctx.fillStyle = textHex;
    ctx.fillText(ch, 0, -radius);
    ctx.restore();

    currentAngle += charArc;
  }
}

/**
 * Paints the complete 2048x2048 solid, opaque, richly saturated 12-sector wheel face
 * with curved Mudra titles along the outer rim and the user's hand-painted Mudra
 * illustrations framed in crisp ivory-gold medallions inside every sector.
 */
function paintWheelFaceCanvas(
  canvas: HTMLCanvasElement,
  sprites: Record<number, MudraSpriteAsset>,
): void {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.488;
  const hubR = size * 0.095;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 100% solid deep burgundy backing so zero transparency can ever bleed through
  ctx.fillStyle = '#2B0508';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < SECTOR_COUNT; i++) {
    const mudra = MUDRAS[i];
    const centerAngle = -Math.PI / 2 + i * SECTOR_ANGLE;
    const startAngle = centerAngle - SECTOR_ANGLE / 2;
    const endAngle = centerAngle + SECTOR_ANGLE / 2;

    // 1. 100% solid, richly saturated sector wedge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, hubR * 0.8, cx, cy, outerR);
    grad.addColorStop(0, mudra.accentHex);
    grad.addColorStop(0.24, mudra.colorHex);
    grad.addColorStop(1, mudra.colorHex);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle crisp ornamental arch frame inside each solid sector
    ctx.clip();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 14, startAngle + 0.015, endAngle - 0.015);
    ctx.strokeStyle = 'rgba(255, 243, 209, 0.55)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Inner solid-accent lotus diamond between medallion and center hub
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(centerAngle + Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(0, -(hubR + 48));
    ctx.lineTo(26, -(hubR + 115));
    ctx.lineTo(0, -(hubR + 185));
    ctx.lineTo(-26, -(hubR + 115));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 249, 240, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    // 2. Bold high-contrast divider lines (dark contour + warm gold center)
    const lx = cx + Math.cos(startAngle) * outerR;
    const ly = cy + Math.sin(startAngle) * outerR;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.strokeStyle = '#2B0508';
    ctx.lineWidth = 13;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 6.5;
    ctx.stroke();
  }

  // Crisp solid outer gold & dark-burgundy rim ring
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 4, 0, TWO_PI);
  ctx.strokeStyle = '#2B0508';
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 5, 0, TWO_PI);
  ctx.strokeStyle = '#F5B324';
  ctx.lineWidth = 10;
  ctx.stroke();

  // 3. Draw Mudra hand medallions AND curved outer uppercase names for all 12 sectors
  const medallionDist = size * 0.308; // r = 631px
  const medallionRadius = size * 0.072; // r = 147px (294px diameter!)
  const labelRadius = size * 0.436; // r = 893px

  for (let i = 0; i < SECTOR_COUNT; i++) {
    const mudra = MUDRAS[i];
    const centerAngle = -Math.PI / 2 + i * SECTOR_ANGLE;

    ctx.save();
    ctx.translate(cx, cy);
    // Align -Y outward along sector bisector so both hand & name are 100% upright at 12 o'clock
    ctx.rotate(centerAngle + Math.PI / 2);

    // A. Solid warm ivory circular medallion with double burgundy/gold bezel
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -medallionDist, medallionRadius + 7, 0, TWO_PI);
    ctx.fillStyle = '#2B0508';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -medallionDist, medallionRadius + 3.5, 0, TWO_PI);
    ctx.fillStyle = '#FDE68A';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -medallionDist, medallionRadius - 2, 0, TWO_PI);
    ctx.fillStyle = '#FFF8EA';
    ctx.fill();

    // Clip inside medallion and draw the exact Mudra hand sprite
    ctx.clip();
    const sprite = sprites[mudra.id];
    if (sprite) {
      const drawSize = medallionRadius * 1.84;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        sprite.canvas,
        -drawSize / 2,
        -medallionDist - drawSize / 2,
        drawSize,
        drawSize,
      );
    }
    ctx.restore();

    // B. Crisp curved uppercase Mudra name right above the medallion along the outer arc
    drawCurvedSectorLabel(ctx, mudra.name.toUpperCase(), labelRadius, mudra.textHex);

    ctx.restore();
  }
}

/**
 * Soft radial shadow texture to ground the wheel on the warm cream backdrop.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.14,
      size / 2,
      size / 2,
      size * 0.49,
    );
    grad.addColorStop(0, 'rgba(26, 2, 5, 0.52)');
    grad.addColorStop(0.65, 'rgba(26, 2, 5, 0.22)');
    grad.addColorStop(1, 'rgba(26, 2, 5, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a single beveled lotus petal geometry centered at the base (y = 0 -> y = length).
 */
function createLotusPetalGeometry(
  length: number,
  width: number,
  depth: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width, length * 0.28, width * 0.88, length * 0.78, 0, length);
  shape.bezierCurveTo(-width * 0.88, length * 0.78, -width, length * 0.28, 0, 0);

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: width * 0.1,
    bevelSegments: 3,
    curveSegments: 14,
  });
}

/**
 * Builds the ornate downward-pointing Bollywood lotus clapper pointer geometry.
 * Pivot sits at (0, 0, 0); tip points downward to -Y.
 */
function createPointerShapeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.18);
  shape.bezierCurveTo(0.24, 0.16, 0.28, -0.1, 0.16, -0.36);
  shape.lineTo(0, -0.78);
  shape.lineTo(-0.16, -0.36);
  shape.bezierCurveTo(-0.28, -0.1, -0.24, 0.16, 0, 0.18);

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.028,
    bevelSegments: 3,
    curveSegments: 16,
  });
}

function easeOutWheel(t: number, power = 4.35): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, power);
}

/**
 * Pure 2D SVG fallback wheel synchronized with the exact same angle math
 * and displaying the exact same cropped Mudra hand illustrations.
 */
function FallbackWheelSVG({
  rotationZ,
  mudraSprites,
}: {
  rotationZ: number;
  mudraSprites: Record<number, MudraSpriteAsset>;
}) {
  const cssDeg = -(rotationZ * 180) / Math.PI;
  const cx = 250;
  const cy = 250;
  const r = 228;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center select-none pointer-events-none"
      role="img"
      aria-label="Roue interactive des 12 mudras"
    >
      {/* Fixed top pointer */}
      <div
        className="pointer-events-none absolute top-0.5 left-1/2 z-20 -translate-x-1/2"
        aria-hidden="true"
      >
        <svg width="46" height="58" viewBox="0 0 46 58">
          <path
            d="M23 55 L7 18 C4 10 11 3 23 3 C35 3 42 10 39 18 Z"
            fill="#2B0508"
            stroke="#F5B324"
            strokeWidth="3.5"
          />
          <circle cx="23" cy="18" r="6" fill="#DC2626" />
        </svg>
      </div>

      <svg
        viewBox="0 0 500 500"
        className="h-full w-full max-h-[600px] max-w-[600px] drop-shadow-xl"
      >
        <g style={{ transformOrigin: '250px 250px', transform: `rotate(${cssDeg}deg)` }}>
          <circle cx={cx} cy={cy} r={r + 12} fill="#F5B324" stroke="#2B0508" strokeWidth="5" />
          {MUDRAS.map((mudra, i) => {
            const center = -Math.PI / 2 + i * SECTOR_ANGLE;
            const start = center - SECTOR_ANGLE / 2;
            const end = center + SECTOR_ANGLE / 2;
            const x1 = cx + Math.cos(start) * r;
            const y1 = cy + Math.sin(start) * r;
            const x2 = cx + Math.cos(end) * r;
            const y2 = cy + Math.sin(end) * r;
            const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
            const rotDeg = ((center + Math.PI / 2) * 180) / Math.PI;
            const sprite = mudraSprites[mudra.id];
            const medY = cy - 144;
            const medR = 33;

            return (
              <g key={mudra.id}>
                <path d={pathD} fill={mudra.colorHex} stroke="#2B0508" strokeWidth="2.5" />
                <g transform={`rotate(${rotDeg} ${cx} ${cy})`}>
                  <circle
                    cx={cx}
                    cy={medY}
                    r={medR}
                    fill="#FFF8EA"
                    stroke="#FDE68A"
                    strokeWidth="2.5"
                  />
                  {sprite && (
                    <image
                      href={sprite.dataUrl}
                      x={cx - medR + 3}
                      y={medY - medR + 3}
                      width={(medR - 3) * 2}
                      height={(medR - 3) * 2}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  )}
                  <text
                    x={cx}
                    y={cy - 204}
                    fill={mudra.textHex}
                    fontSize={mudra.name.length > 11 ? '8.8' : mudra.name.length > 8 ? '10.2' : '11.5'}
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {mudra.name.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r="32" fill="#C41E24" stroke="#FDE68A" strokeWidth="4.5" />
          <circle cx={cx} cy={cy} r="13" fill="#FFF8EA" />
        </g>
      </svg>
    </div>
  );
}

export const MudraWheel3D = forwardRef<MudraWheelHandle, MudraWheel3DProps>(
  function MudraWheel3D(
    {
      canSpin,
      canRecordSpin,
      isSpinning,
      onWheelClick,
      onManualSpinStart,
      onSpinInterrupt,
      onSpinComplete,
      highlightFinale,
      mudraSprites,
    },
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const rotorGroupRef = useRef<THREE.Group | null>(null);
    const [useFallback, setUseFallback] = useState(false);
    const [fallbackRotationZ, setFallbackRotationZ] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Keep latest callbacks & flags in refs so WebGL scene never tears down on prop updates
    const canSpinRef = useRef(canSpin);
    canSpinRef.current = canSpin;

    const canRecordSpinRef = useRef(canRecordSpin);
    canRecordSpinRef.current = canRecordSpin;

    const onWheelClickRef = useRef(onWheelClick);
    onWheelClickRef.current = onWheelClick;

    const onManualSpinStartRef = useRef(onManualSpinStart);
    onManualSpinStartRef.current = onManualSpinStart;

    const onSpinInterruptRef = useRef(onSpinInterrupt);
    onSpinInterruptRef.current = onSpinInterrupt;

    const onSpinCompleteRef = useRef(onSpinComplete);
    onSpinCompleteRef.current = onSpinComplete;

    const highlightFinaleRef = useRef(highlightFinale);
    highlightFinaleRef.current = highlightFinale;

    const mudraSpritesRef = useRef(mudraSprites);
    mudraSpritesRef.current = mudraSprites;

    const wheelBoxRef = useRef<HTMLDivElement | null>(null);
    const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const faceTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const requestRenderRef = useRef<(() => void) | null>(null);

    const spinStateRef = useRef({
      active: false,
      countsForSequence: true,
      startTime: 0,
      durationMs: 5000,
      easePower: 4.35,
      startRotationZ: 0,
      targetRotationZ: 0,
      currentRotationZ: 0,
      lastPegBucket: 0,
      landingGlowTime: 0,
      pointerAngle: 0,
      pointerVel: 0,
    });

    const dragStateRef = useRef<{
      active: boolean;
      wasCaughtMidSpin: boolean;
      pointerId: number;
      centerX: number;
      centerY: number;
      startTimeMs: number;
      startRotZ: number;
      lastMoveTime: number;
      lastClientX: number;
      lastClientY: number;
      lastAngle: number;
      totalAbsAngle: number;
      smoothVel: number;
      moveHistory: Array<{ t: number; rot: number }>;
    }>({
      active: false,
      wasCaughtMidSpin: false,
      pointerId: -1,
      centerX: 0,
      centerY: 0,
      startTimeMs: 0,
      startRotZ: 0,
      lastMoveTime: 0,
      lastClientX: 0,
      lastClientY: 0,
      lastAngle: 0,
      totalAbsAngle: 0,
      smoothVel: 0,
      moveHistory: [],
    });

    const triggerLoopRef = useRef<(() => void) | null>(null);
    const fallbackFrameRef = useRef<number>(0);

    const startSpinAnimation = useCallback(
      (
        targetRot: number,
        durationMs: number,
        countsForSequence: boolean,
        easePower = 4.35,
      ) => {
        const st = spinStateRef.current;
        const startRot = st.currentRotationZ;

        st.active = true;
        st.countsForSequence = countsForSequence;
        st.startTime = performance.now();
        st.durationMs = durationMs;
        st.easePower = easePower;
        st.startRotationZ = startRot;
        st.targetRotationZ = targetRot;
        st.lastPegBucket = Math.floor((startRot + SECTOR_ANGLE / 2) / SECTOR_ANGLE);
        st.landingGlowTime = 0;

        if (useFallback) {
          const stepFallback = () => {
            const now = performance.now();
            const elapsed = now - st.startTime;
            const t = Math.min(1, elapsed / st.durationMs);
            const eased = easeOutWheel(t, st.easePower);
            const rot = st.startRotationZ + (st.targetRotationZ - st.startRotationZ) * eased;
            st.currentRotationZ = rot;

            const pegBucket = Math.floor((rot + SECTOR_ANGLE / 2) / SECTOR_ANGLE);
            if (pegBucket !== st.lastPegBucket) {
              st.lastPegBucket = pegBucket;
              const totalAbsDelta = Math.abs(st.targetRotationZ - st.startRotationZ);
              const durationSec = Math.max(0.1, st.durationMs / 1000);
              const instSpeed =
                ((st.easePower * totalAbsDelta) / durationSec) *
                Math.pow(1 - t, Math.max(0, st.easePower - 1));
              const speedFactor = Math.min(1, Math.max(0.06, instSpeed / 20));
              mudraAudio.playTick(speedFactor);
            }

            setFallbackRotationZ(rot);

            if (t < 1 && st.active) {
              fallbackFrameRef.current = requestAnimationFrame(stepFallback);
            } else if (st.active) {
              st.active = false;
              st.currentRotationZ = st.targetRotationZ;
              setFallbackRotationZ(st.targetRotationZ);
              if (st.countsForSequence) {
                const verified = getSectorIndexAtRotation(st.currentRotationZ);
                onSpinCompleteRef.current(verified);
              }
            }
          };
          cancelAnimationFrame(fallbackFrameRef.current);
          fallbackFrameRef.current = requestAnimationFrame(stepFallback);
        } else {
          triggerLoopRef.current?.();
        }
      },
      [useFallback],
    );

    useImperativeHandle(
      ref,
      () => ({
        spinTo(targetSectorIndex: number, durationMs: number) {
          const st = spinStateRef.current;
          if (st.active && st.countsForSequence) return;
          dragStateRef.current.active = false;
          setIsDragging(false);

          const startRot = st.currentRotationZ;
          const targetRot = computeTargetSpinRotation(startRot, targetSectorIndex);
          startSpinAnimation(targetRot, durationMs, true);
        },
      }),
      [startSpinAnimation],
    );

    const handlePointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        // Synchronously unlock Web Audio on iPadOS / iOS Safari on every touch
        mudraAudio.unlock();

        // Only respond to primary touch/mouse button
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const st = spinStateRef.current;
        const wasSpinning = st.active || !canSpinRef.current;
        let caughtMidSpin = false;

        // Allow grabbing and stopping the wheel at ANY moment mid-spin without validating!
        if (st.active) {
          caughtMidSpin = true;
          st.active = false;
          st.countsForSequence = false;
          st.landingGlowTime = 0;
          cancelAnimationFrame(fallbackFrameRef.current);
          onSpinInterruptRef.current?.();
          if (!useFallback) {
            triggerLoopRef.current?.();
          }
        } else if (wasSpinning && canRecordSpinRef.current) {
          // Interrupt a pending duplicate auto-respin countdown if the user grabs the wheel
          caughtMidSpin = true;
          onSpinInterruptRef.current?.();
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

        const now = performance.now();
        dragStateRef.current = {
          active: true,
          wasCaughtMidSpin: caughtMidSpin,
          pointerId: e.pointerId,
          centerX,
          centerY,
          startTimeMs: now,
          startRotZ: st.currentRotationZ,
          lastMoveTime: now,
          lastClientX: e.clientX,
          lastClientY: e.clientY,
          lastAngle: initialAngle,
          totalAbsAngle: 0,
          smoothVel: 0,
          moveHistory: [],
        };

        st.lastPegBucket = Math.floor((st.currentRotationZ + SECTOR_ANGLE / 2) / SECTOR_ANGLE);
        setIsDragging(true);

        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if pointer capture isn't supported
        }
      },
      [useFallback],
    );

    const handlePointerMove = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragStateRef.current;
        if (!drag.active || e.pointerId !== drag.pointerId) return;

        const now = performance.now();
        const rx = e.clientX - drag.centerX;
        const ry = e.clientY - drag.centerY;
        const dx = e.clientX - drag.lastClientX;
        const dy = e.clientY - drag.lastClientY;
        drag.lastClientX = e.clientX;
        drag.lastClientY = e.clientY;

        const angle = Math.atan2(ry, rx);
        const r2 = rx * rx + ry * ry;
        let dScreen = 0;

        if (r2 >= 30 * 30) {
          dScreen = angle - drag.lastAngle;
          while (dScreen > Math.PI) dScreen -= TWO_PI;
          while (dScreen < -Math.PI) dScreen += TWO_PI;
        } else {
          // Center-safe tangential torque so swiping near the hub never flips 180 deg
          dScreen = (rx * dy - ry * dx) / (30 * 30);
          if (r2 < 14 * 14 && Math.abs(dScreen) < 0.002) {
            dScreen = (dy + dx) / 140;
          }
        }
        drag.lastAngle = angle;

        // Screen clockwise (+dScreen) corresponds to negative Three.js Z rotation (-dScreen)
        const dRot = -dScreen;
        if (Math.abs(dRot) < 0.0001) return;

        const dtSec = Math.max(0.004, Math.min(0.06, (now - drag.lastMoveTime) / 1000));
        drag.lastMoveTime = now;
        const instVel = dRot / dtSec;
        drag.smoothVel =
          drag.moveHistory.length === 0 ? instVel : drag.smoothVel * 0.45 + instVel * 0.55;

        drag.totalAbsAngle += Math.abs(dRot);

        const st = spinStateRef.current;
        st.currentRotationZ += dRot;

        drag.moveHistory.push({ t: now, rot: st.currentRotationZ });
        while (drag.moveHistory.length > 2 && now - drag.moveHistory[0].t > 160) {
          drag.moveHistory.shift();
        }

        if (rotorGroupRef.current) {
          rotorGroupRef.current.rotation.z = st.currentRotationZ;
        }
        if (useFallback) {
          setFallbackRotationZ(st.currentRotationZ);
        }

        // Track peg crossings & play tactile sound + spring clapper scaled to actual hand speed
        const pegBucket = Math.floor((st.currentRotationZ + SECTOR_ANGLE / 2) / SECTOR_ANGLE);
        if (pegBucket !== st.lastPegBucket) {
          st.lastPegBucket = pegBucket;
          const speedFactor = Math.min(1, Math.max(0.08, Math.abs(drag.smoothVel) / 20));
          const clapperDir = dRot < 0 ? 1 : -1;
          st.pointerVel = THREE.MathUtils.clamp(
            st.pointerVel + clapperDir * (3.4 + speedFactor * 8.6),
            -14,
            14,
          );
          mudraAudio.playTick(speedFactor);
        }

        if (!useFallback) {
          triggerLoopRef.current?.();
        }
      },
      [useFallback],
    );

    const finishDrag = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
        const drag = dragStateRef.current;
        if (!drag.active || e.pointerId !== drag.pointerId) return;

        const caughtMidSpin = drag.wasCaughtMidSpin;
        drag.active = false;
        drag.wasCaughtMidSpin = false;
        setIsDragging(false);

        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore
        }

        const now = performance.now();
        const elapsedMs = now - drag.startTimeMs;
        const history = drag.moveHistory;

        // 1. Quick tap (only when not cancelled): if wheel was caught mid-spin, keep it stopped.
        //    Otherwise, behave like clicking the wheel to launch a full draw spin.
        if (!cancelled && drag.totalAbsAngle < 0.08 && elapsedMs < 320) {
          if (!caughtMidSpin && canSpinRef.current) {
            onWheelClickRef.current();
          }
          return;
        }

        if (history.length === 0) {
          if (!useFallback) triggerLoopRef.current?.();
          return;
        }

        // 2. iPhone-style position-vs-time velocity tracker (immune to touch liftoff latency)
        const lastSample = history[history.length - 1];
        const idleMs = now - lastSample.t;
        let releaseVel = 0;

        // If user held their finger completely still > 180ms before lifting, they stopped the wheel
        if (idleMs <= 180) {
          let rawVel = 0;
          if (history.length >= 2) {
            // Find an anchor point ~25-110ms before the final move sample
            let anchor = history[0];
            for (let i = history.length - 2; i >= 0; i--) {
              anchor = history[i];
              if (lastSample.t - anchor.t >= 60) {
                break;
              }
            }
            const spanSec = Math.max(0.012, (lastSample.t - anchor.t) / 1000);
            rawVel = (lastSample.rot - anchor.rot) / spanSec;
          } else {
            // Ultra-fast single-frame flick on touch screen
            const spanSec = Math.min(0.045, Math.max(0.012, (lastSample.t - drag.startTimeMs) / 1000));
            rawVel = (lastSample.rot - drag.startRotZ) / spanSec;
          }

          // Full 100% power for normal iPhone/iPad liftoff latency (<= 75ms), smooth taper if slowing down
          const pauseFactor =
            idleMs <= 75 ? 1 : Math.max(0, 1 - (idleMs - 75) / 105);
          releaseVel = rawVel * pauseFactor;
        }

        // 3. iPhone UIScrollView-style momentum launch:
        //    gentle push glides slowly & stops near; hard flick flies fast across many turns!
        if (Math.abs(releaseVel) >= 0.35) {
          const st = spinStateRef.current;
          const clampedVel = Math.sign(releaseVel) * Math.min(55, Math.abs(releaseVel));
          const absVel = Math.abs(clampedVel);
          const direction = Math.sign(clampedVel);
          const handEasePower = 2.8;

          // Logarithmic stopping time matching exponential UIScrollView deceleration
          const naturalDurationSec = Math.min(
            7.2,
            Math.max(0.75, Math.log(Math.max(1.5, absVel / 0.28)) / 0.72),
          );
          // For easeOutWheel(t, p), initial angular speed is v0 = (p * delta) / T => delta = (v0 * T) / p
          const rawDelta = (clampedVel * naturalDurationSec) / handEasePower;
          let snappedTarget =
            Math.round((st.currentRotationZ + rawDelta) / SECTOR_ANGLE) * SECTOR_ANGLE;

          // Never snap backward against the flick or stop on a microscopic sliver
          if ((snappedTarget - st.currentRotationZ) * direction < SECTOR_ANGLE * 0.25) {
            snappedTarget += direction * SECTOR_ANGLE;
          }

          // Recompute exact duration from snapped distance so release speed matches finger speed 100%
          const finalDelta = Math.abs(snappedTarget - st.currentRotationZ);
          const exactDurationMs = Math.max(
            450,
            Math.min(7800, ((handEasePower * finalDelta) / absVel) * 1000),
          );

          const countsForSequence = canRecordSpinRef.current;
          if (countsForSequence) {
            onManualSpinStartRef.current?.();
          }
          startSpinAnimation(snappedTarget, exactDurationMs, countsForSequence, handEasePower);
        } else if (!useFallback) {
          // Gentle manual stop/placement: wheel stays stopped, unvalidated, clapper settles
          triggerLoopRef.current?.();
        }
      },
      [startSpinAnimation, useFallback],
    );

    // Prevent iOS/iPadOS Safari from hijacking fast vertical swipes on the wheel for page scrolling
    useEffect(() => {
      const el = wheelBoxRef.current;
      if (!el) return;
      const preventTouchScroll = (e: TouchEvent) => {
        if (e.cancelable) {
          e.preventDefault();
        }
      };
      el.addEventListener('touchmove', preventTouchScroll, { passive: false });
      return () => {
        el.removeEventListener('touchmove', preventTouchScroll);
      };
    }, []);

    useEffect(() => {
      return () => {
        cancelAnimationFrame(fallbackFrameRef.current);
      };
    }, []);

    // Repaint the 2048x2048 Three.js wheel texture as soon as the 12 Mudra hand sprites finish loading
    useEffect(() => {
      const faceCanvas = faceCanvasRef.current;
      const faceTex = faceTextureRef.current;
      if (!faceCanvas || !faceTex) return;
      paintWheelFaceCanvas(faceCanvas, mudraSprites);
      faceTex.needsUpdate = true;
      requestRenderRef.current?.();
    }, [mudraSprites]);

    // Trigger subtle re-render when finale celebration state changes
    useEffect(() => {
      if (highlightFinale && !useFallback) {
        spinStateRef.current.landingGlowTime = 1.4;
        triggerLoopRef.current?.();
      }
    }, [highlightFinale, useFallback]);

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      // Probe WebGL2 + software renderer without relying on user agent
      let isSoftwareGl = false;
      let hasWebGL = false;
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (gl) {
          hasWebGL = true;
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
          const gpu = String(gl.getParameter(param));
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        }
      } catch {
        hasWebGL = false;
      }

      if (!hasWebGL) {
        setUseFallback(true);
        return;
      }

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          alpha: true,
          powerPreference: 'high-performance',
        });
      } catch {
        setUseFallback(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // NeutralToneMapping preserves exact vivid opaque Bollywood colors without washing them out
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 0.92;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0);

      const canvasEl = renderer.domElement;
      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      canvasEl.style.display = 'block';
      container.innerHTML = '';
      container.appendChild(canvasEl);

      const scene = new THREE.Scene();

      // Studio PBR Environment reflections via RoomEnvironment (strong on gold bezel, minimal on painted face)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();

      // Perspective camera framing the entire wheel + top lotus pointer cleanly
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
      camera.position.set(0, 0.08, 10.6);
      camera.lookAt(0, 0.04, 0);

      // Calibrated 3-point studio lighting: front face hits exact ~1.0 true pigment luminance (zero washout)
      const hemiLight = new THREE.HemisphereLight(0xfff4d6, 0x7a1c22, 0.58);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff7ea, 0.8);
      keyLight.position.set(3.8, 5.5, 9.2);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 2;
        keyLight.shadow.camera.far = 20;
        keyLight.shadow.camera.left = -4.5;
        keyLight.shadow.camera.right = 4.5;
        keyLight.shadow.camera.top = 4.5;
        keyLight.shadow.camera.bottom = -4.5;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
      }
      scene.add(keyLight);

      // True backlight rim positioned behind the wheel to highlight the 3D gold bezel without bleaching the front face
      const rimLight = new THREE.DirectionalLight(0xfde68a, 0.95);
      rimLight.position.set(-5.5, 2.5, -4.0);
      scene.add(rimLight);

      // Disposable resource registry
      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];
      const textures: THREE.Texture[] = [];

      const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
        geometries.push(g);
        return g;
      };
      const trackMat = <T extends THREE.Material>(m: T): T => {
        materials.push(m);
        return m;
      };
      const trackTex = <T extends THREE.Texture>(t: T): T => {
        textures.push(t);
        return t;
      };

      const stageGroup = new THREE.Group();
      stageGroup.position.set(0, -0.08, 0);
      stageGroup.rotation.x = -0.045;
      scene.add(stageGroup);

      // Soft grounding shadow directly behind the wheel
      const shadowTex = trackTex(createContactShadowTexture());
      const shadowPlane = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(WHEEL_RADIUS * 2.48, WHEEL_RADIUS * 2.48)),
        trackMat(
          new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            depthWrite: false,
            opacity: 0.85,
          }),
        ),
      );
      shadowPlane.position.set(0, -0.18, -0.45);
      stageGroup.add(shadowPlane);

      // ================================================================
      // COMPOSITE SOLID SPINNING WHEEL ROTOR GROUP (9 distinct 3D parts)
      // ================================================================
      const rotorGroup = new THREE.Group();
      rotorGroup.rotation.z = spinStateRef.current.currentRotationZ;
      rotorGroupRef.current = rotorGroup;
      stageGroup.add(rotorGroup);

      // Part 1: Front 12-Sector Solid Mudra Disc (2048x2048 CanvasTexture with Mudra hands)
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 2048;
      faceCanvas.height = 2048;
      paintWheelFaceCanvas(faceCanvas, mudraSpritesRef.current);
      faceCanvasRef.current = faceCanvas;

      const faceTexture = trackTex(new THREE.CanvasTexture(faceCanvas));
      faceTexture.colorSpace = THREE.SRGBColorSpace;
      faceTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      faceTextureRef.current = faceTexture;

      // Low envMapIntensity + high matte roughness keeps colors 100% opaque, vivid, and zero-glare
      const faceMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: faceTexture,
          roughness: 0.92,
          metalness: 0.0,
          envMapIntensity: 0.06,
          transparent: false,
          opacity: 1.0,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      const faceMesh = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(WHEEL_RADIUS, 96)),
        faceMat,
      );
      faceMesh.position.z = 0.21;
      faceMesh.receiveShadow = !isSoftwareGl;
      rotorGroup.add(faceMesh);

      // Part 2: Thick Solid Deep-Burgundy Sculpted Cabinet Drum Body
      const drumMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x2b0508,
          roughness: 0.54,
          metalness: 0.16,
          envMapIntensity: 0.45,
        }),
      );
      const drumGeo = trackGeo(
        new THREE.CylinderGeometry(WHEEL_RADIUS + 0.05, WHEEL_RADIUS + 0.11, 0.4, 96),
      );
      drumGeo.rotateX(Math.PI / 2);
      const drumMesh = new THREE.Mesh(drumGeo, drumMat);
      drumMesh.castShadow = !isSoftwareGl;
      drumMesh.receiveShadow = !isSoftwareGl;
      rotorGroup.add(drumMesh);

      // Part 3: Brushed-Gold Outer Bezel Torus Ring (high metallic sheen)
      const goldRimMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xf5b324,
          metalness: 0.88,
          roughness: 0.22,
          envMapIntensity: 1.25,
          clearcoat: 0.4,
          clearcoatRoughness: 0.22,
          emissive: 0x000000,
          emissiveIntensity: 0,
        }),
      );
      const outerBezel = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(WHEEL_RADIUS + 0.06, 0.135, 24, 96)),
        goldRimMat,
      );
      outerBezel.position.z = 0.15;
      outerBezel.castShadow = !isSoftwareGl;
      rotorGroup.add(outerBezel);

      // Part 4: Compact Inner Gold Fillet Ring around the Lotus Centerpiece
      const innerFilletMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfde68a,
          metalness: 0.85,
          roughness: 0.24,
          envMapIntensity: 1.1,
        }),
      );
      const innerFillet = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(WHEEL_RADIUS * 0.2, 0.036, 16, 64)),
        innerFilletMat,
      );
      innerFillet.position.z = 0.23;
      rotorGroup.add(innerFillet);

      // Part 5: 12 Brass Rim Clapper Pegs (InstancedMesh) placed on exact sector dividers
      const pegGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.054, 0.19, 16));
      pegGeo.rotateX(Math.PI / 2);
      const pegMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.92,
          roughness: 0.18,
          envMapIntensity: 1.25,
        }),
      );
      const pegsMesh = new THREE.InstancedMesh(pegGeo, pegMat, SECTOR_COUNT);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < SECTOR_COUNT; i++) {
        const angle = Math.PI / 2 - (i + 0.5) * SECTOR_ANGLE;
        const pegR = WHEEL_RADIUS + 0.025;
        dummy.position.set(Math.cos(angle) * pegR, Math.sin(angle) * pegR, 0.28);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pegsMesh.setMatrixAt(i, dummy.matrix);
      }
      pegsMesh.instanceMatrix.needsUpdate = true;
      pegsMesh.computeBoundingSphere();
      rotorGroup.add(pegsMesh);

      // Part 6: 24 Bollywood Marquee Jewel Studs embedded around Outer Gold Bezel
      const jewelCount = 24;
      const jewelGeo = trackGeo(new THREE.SphereGeometry(0.048, 14, 14));
      const jewelMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.22,
          metalness: 0.12,
          envMapIntensity: 0.6,
        }),
      );
      const jewelsMesh = new THREE.InstancedMesh(jewelGeo, jewelMat, jewelCount);
      const jewelPalette = [
        new THREE.Color('#FFF8EA'),
        new THREE.Color('#DC2626'),
        new THREE.Color('#F5B324'),
        new THREE.Color('#FDE68A'),
      ];
      for (let i = 0; i < jewelCount; i++) {
        const angle = (i / jewelCount) * TWO_PI;
        const jr = WHEEL_RADIUS + 0.08;
        dummy.position.set(Math.cos(angle) * jr, Math.sin(angle) * jr, 0.265);
        dummy.scale.set(1, 1, 0.65);
        dummy.updateMatrix();
        jewelsMesh.setMatrixAt(i, dummy.matrix);
        jewelsMesh.setColorAt(i, jewelPalette[i % jewelPalette.length]);
      }
      jewelsMesh.instanceMatrix.needsUpdate = true;
      if (jewelsMesh.instanceColor) jewelsMesh.instanceColor.needsUpdate = true;
      jewelsMesh.computeBoundingSphere();
      rotorGroup.add(jewelsMesh);

      // Part 7: Sculpted 3D Royal Red & Gold Lotus Medallion Hub
      const lotusHubGroup = new THREE.Group();
      lotusHubGroup.position.z = 0.22;
      rotorGroup.add(lotusHubGroup);

      const hubBase = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.5, 0.54, 0.09, 48)).rotateX(Math.PI / 2),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x2b0508,
            roughness: 0.42,
            metalness: 0.2,
          }),
        ),
      );
      lotusHubGroup.add(hubBase);

      const outerPetalGeo = trackGeo(createLotusPetalGeometry(0.44, 0.135, 0.042));
      const outerPetalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xc41e24,
          roughness: 0.34,
          metalness: 0.16,
          envMapIntensity: 0.4,
        }),
      );
      for (let i = 0; i < 8; i++) {
        const petal = new THREE.Mesh(outerPetalGeo, outerPetalMat);
        petal.rotation.z = (i * TWO_PI) / 8;
        petal.position.z = 0.032;
        lotusHubGroup.add(petal);
      }

      const innerPetalGeo = trackGeo(createLotusPetalGeometry(0.3, 0.1, 0.04));
      const innerPetalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf5b324,
          roughness: 0.22,
          metalness: 0.78,
          envMapIntensity: 1.1,
        }),
      );
      for (let i = 0; i < 8; i++) {
        const petal = new THREE.Mesh(innerPetalGeo, innerPetalMat);
        petal.rotation.z = ((i + 0.5) * TWO_PI) / 8;
        petal.position.z = 0.078;
        lotusHubGroup.add(petal);
      }

      const pearlCore = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.15, 24, 24)),
        trackMat(
          new THREE.MeshPhysicalMaterial({
            color: 0xfff8ea,
            roughness: 0.18,
            metalness: 0.06,
            clearcoat: 0.8,
            envMapIntensity: 0.45,
          }),
        ),
      );
      pearlCore.scale.set(1, 1, 0.55);
      pearlCore.position.z = 0.12;
      lotusHubGroup.add(pearlCore);

      // ================================================================
      // FIXED TOP POINTER CROWN & SPRING-LOADED CLAPPER AT 12 O'CLOCK
      // ================================================================
      const pointerMount = new THREE.Group();
      pointerMount.position.set(0, WHEEL_RADIUS + 0.38, 0.31);
      stageGroup.add(pointerMount);

      // Part 8: Fixed Brass Crown Cap behind pivot
      const crownPlate = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.26, 0.3, 0.14, 32)).rotateX(Math.PI / 2),
        goldRimMat,
      );
      crownPlate.position.z = -0.02;
      pointerMount.add(crownPlate);

      // Part 9: Pivoting High-Contrast Lotus Clapper Spear
      const pointerPivot = new THREE.Group();
      pointerPivot.position.set(0, 0, 0.04);
      pointerMount.add(pointerPivot);

      const pointerBody = new THREE.Mesh(
        trackGeo(createPointerShapeGeometry()),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x2b0508,
            roughness: 0.34,
            metalness: 0.22,
          }),
        ),
      );
      pointerBody.castShadow = !isSoftwareGl;
      pointerPivot.add(pointerBody);

      const pointerInset = new THREE.Mesh(
        trackGeo(createPointerShapeGeometry()),
        goldRimMat,
      );
      pointerInset.scale.set(0.66, 0.72, 0.55);
      pointerInset.position.set(0, -0.04, 0.095);
      pointerPivot.add(pointerInset);

      const pivotJewel = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.115, 20, 20)),
        trackMat(
          new THREE.MeshPhysicalMaterial({
            color: 0xdc2626,
            roughness: 0.15,
            metalness: 0.12,
            clearcoat: 1.0,
          }),
        ),
      );
      pivotJewel.scale.set(1, 1, 0.58);
      pivotJewel.position.set(0, 0.01, 0.145);
      pointerPivot.add(pivotJewel);

      // Resize handling
      const handleResize = () => {
        if (!container) return;
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        camera.aspect = w / h;
        const minAxis = Math.min(w, h);
        const aspectScale = w < h ? h / w : 1;
        camera.position.z = Math.max(10.65, 10.65 * Math.min(aspectScale, 1.32));
        camera.fov = minAxis < 360 ? 36 : 34;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        requestRender();
      };

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // ================================================================
      // ON-DEMAND & SOFTWARE-WEBGL-PACED RENDER LOOP
      // ================================================================
      let frameId = 0;
      let disposed = false;
      let loopRunning = false;
      let lastFrameTime = performance.now();
      let renderBusy = false;
      let renderDirty = false;

      const afterDraw = (cb: () => void) => {
        if (disposed) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) return;
            const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (status === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(cb, 80);
        }
      };

      const requestRender = () => {
        if (disposed || loopRunning) return;
        if (renderBusy) {
          renderDirty = true;
          return;
        }
        renderBusy = true;
        frameId = requestAnimationFrame(() => {
          if (disposed) return;
          renderDirty = false;
          renderer.render(scene, camera);
          const done = () => {
            renderBusy = false;
            if (renderDirty && !disposed && !loopRunning) {
              requestRender();
            }
          };
          if (isSoftwareGl) afterDraw(done);
          else done();
        });
      };
      requestRenderRef.current = requestRender;

      const stepAnimation = () => {
        if (disposed) return;
        const now = performance.now();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
        lastFrameTime = now;

        const st = spinStateRef.current;
        let needsAnotherFrame = false;

        if (st.active) {
          const elapsed = now - st.startTime;
          const t = Math.min(1, elapsed / st.durationMs);
          const eased = easeOutWheel(t, st.easePower);
          const rotZ =
            st.startRotationZ + (st.targetRotationZ - st.startRotationZ) * eased;

          st.currentRotationZ = rotZ;
          rotorGroup.rotation.z = rotZ;

          const totalAbsDelta = Math.abs(st.targetRotationZ - st.startRotationZ);
          const durationSec = Math.max(0.1, st.durationMs / 1000);
          const instSpeed =
            ((st.easePower * totalAbsDelta) / durationSec) *
            Math.pow(1 - t, Math.max(0, st.easePower - 1));

          // Detect peg boundary crossing at 12 o'clock (works clockwise & counter-clockwise)
          const pegBucket = Math.floor((rotZ + SECTOR_ANGLE / 2) / SECTOR_ANGLE);
          if (pegBucket !== st.lastPegBucket) {
            st.lastPegBucket = pegBucket;
            const speedFactor = Math.min(1, Math.max(0.06, instSpeed / 20));
            const clapperDir = st.targetRotationZ < st.startRotationZ ? 1 : -1;
            st.pointerVel = THREE.MathUtils.clamp(
              st.pointerVel + clapperDir * (3.4 + speedFactor * 8.6),
              -14,
              14,
            );
            mudraAudio.playTick(speedFactor);
          }

          const tiltStrength = Math.min(1, totalAbsDelta / 12);
          const targetTiltX = -0.045 - Math.sin(t * Math.PI) * 0.04 * tiltStrength;
          stageGroup.rotation.x = THREE.MathUtils.damp(
            stageGroup.rotation.x,
            targetTiltX,
            6,
            dt,
          );

          if (t >= 1) {
            st.active = false;
            st.currentRotationZ = st.targetRotationZ;
            rotorGroup.rotation.z = st.targetRotationZ;
            st.landingGlowTime = 0.95;
            if (st.countsForSequence) {
              const verifiedSector = getSectorIndexAtRotation(st.currentRotationZ);
              onSpinCompleteRef.current(verifiedSector);
            }
          }
          needsAnotherFrame = true;
        } else {
          if (dragStateRef.current.active) {
            rotorGroup.rotation.z = st.currentRotationZ;
            needsAnotherFrame = true;
          }
          if (Math.abs(stageGroup.rotation.x + 0.045) > 0.0008) {
            stageGroup.rotation.x = THREE.MathUtils.damp(
              stageGroup.rotation.x,
              -0.045,
              7,
              dt,
            );
            needsAnotherFrame = true;
          } else {
            stageGroup.rotation.x = -0.045;
          }
        }

        // Second-order damped spring physics for the physical top clapper pointer (bidirectional)
        if (
          Math.abs(st.pointerAngle) > 0.001 ||
          Math.abs(st.pointerVel) > 0.01
        ) {
          const stiffness = 240;
          const damping = 16;
          const accel = -stiffness * st.pointerAngle - damping * st.pointerVel;
          st.pointerVel += accel * dt;
          st.pointerAngle += st.pointerVel * dt;
          st.pointerAngle = THREE.MathUtils.clamp(st.pointerAngle, -0.52, 0.52);
          pointerPivot.rotation.z = st.pointerAngle;
          needsAnotherFrame = true;
        } else {
          st.pointerAngle = 0;
          st.pointerVel = 0;
          pointerPivot.rotation.z = 0;
        }

        // Warm golden bezel celebration shimmer on landing or finale
        if (st.landingGlowTime > 0) {
          st.landingGlowTime = Math.max(0, st.landingGlowTime - dt);
          const pulse = Math.sin((1 - st.landingGlowTime) * Math.PI * 3) * 0.5 + 0.5;
          goldRimMat.emissive.setHex(highlightFinaleRef.current ? 0xdc2626 : 0xf5b324);
          goldRimMat.emissiveIntensity = pulse * 0.3 * Math.min(1, st.landingGlowTime * 2);
          needsAnotherFrame = true;
        } else if (goldRimMat.emissiveIntensity > 0) {
          goldRimMat.emissiveIntensity = 0;
        }

        renderer.render(scene, camera);

        if (needsAnotherFrame) {
          if (isSoftwareGl) afterDraw(stepAnimation);
          else frameId = requestAnimationFrame(stepAnimation);
        } else {
          loopRunning = false;
        }
      };

      const startLoop = () => {
        if (disposed || loopRunning) return;
        loopRunning = true;
        lastFrameTime = performance.now();
        frameId = requestAnimationFrame(stepAnimation);
      };
      triggerLoopRef.current = startLoop;

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setUseFallback(true);
      };
      canvasEl.addEventListener('webglcontextlost', onContextLost);

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      handleResize();

      return () => {
        disposed = true;
        triggerLoopRef.current = null;
        requestRenderRef.current = null;
        rotorGroupRef.current = null;
        faceCanvasRef.current = null;
        faceTextureRef.current = null;
        cancelAnimationFrame(frameId);
        window.clearTimeout(frameId);
        resizeObserver.disconnect();
        canvasEl.removeEventListener('webglcontextlost', onContextLost);
        envRT.dispose();
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
        renderer.dispose();
        if (canvasEl.parentNode === container) {
          container.removeChild(canvasEl);
        }
      };
    }, []);

    return (
      <div
        ref={wheelBoxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
        onLostPointerCapture={(e) => finishDrag(e, true)}
        role="button"
        tabIndex={canSpin ? 0 : -1}
        aria-label={
          isSpinning
            ? 'La roue tourne — touchez-la pour l’arrêter à la main sans valider'
            : canSpin
              ? 'Tourner ou lancer la roue des mudras à la main'
              : 'Tourner librement la roue des 12 mudras à la main'
        }
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && canSpin) {
            e.preventDefault();
            mudraAudio.unlock();
            onWheelClick();
          }
        }}
        className={`relative flex aspect-square w-full max-w-[600px] items-center justify-center mx-auto rounded-full touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/60 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {useFallback ? (
          <FallbackWheelSVG
            rotationZ={fallbackRotationZ}
            mudraSprites={mudraSprites}
          />
        ) : (
          <div ref={mountRef} className="h-full w-full pointer-events-none" />
        )}
      </div>
    );
  },
);
