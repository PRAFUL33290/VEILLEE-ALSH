import { type CSSProperties, useEffect, useState } from 'react';

export interface LevelSuccessAnnouncement {
  readonly id: number;
  readonly completedLabel: string;
  readonly nextLabel: string;
  readonly addedMudras: number;
}

interface LevelSuccessToastProps {
  announcement: LevelSuccessAnnouncement | null;
}

const SPARKS = [
  { x: '-96px', y: '-38px', delay: '40ms', color: '#FCD34D', size: 10 },
  { x: '98px', y: '-34px', delay: '60ms', color: '#6EE7B7', size: 10 },
  { x: '-118px', y: '6px', delay: '90ms', color: '#6EE7B7', size: 8 },
  { x: '118px', y: '8px', delay: '80ms', color: '#FCD34D', size: 9 },
  { x: '-74px', y: '44px', delay: '110ms', color: '#F5B324', size: 8 },
  { x: '76px', y: '42px', delay: '100ms', color: '#FDE68A', size: 8 },
  { x: '-36px', y: '-52px', delay: '50ms', color: '#FDE68A', size: 7 },
  { x: '38px', y: '-50px', delay: '70ms', color: '#34D399', size: 7 },
] as const;

/**
 * Brief, non-blocking Bollywood gold & emerald celebration stamp displayed when
 * the host clicks "NIVEAU RÉUSSI" to validate the level and advance.
 */
export function LevelSuccessToast({ announcement }: LevelSuccessToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!announcement) {
      setIsLeaving(false);
      return;
    }

    setIsLeaving(false);
    const leaveId = window.setTimeout(() => {
      setIsLeaving(true);
    }, 1800);

    return () => {
      window.clearTimeout(leaveId);
    };
  }, [announcement]);

  if (!announcement) return null;

  const addedText =
    announcement.addedMudras > 1
      ? `+${announcement.addedMudras} mudras`
      : `+${announcement.addedMudras} mudra`;

  return (
    <div
      key={announcement.id}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 sm:top-24 z-[65] flex justify-center px-4"
    >
      <div
        className={`relative flex items-center gap-3.5 sm:gap-4 rounded-2xl border-2 border-[#FCD34D] bg-[#2D0408]/96 px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xl shadow-black/65 backdrop-blur-md ${
          isLeaving ? 'animate-level-ok-out' : 'animate-level-ok-in'
        }`}
      >
        {/* Expanding golden-emerald halo ring */}
        <span
          aria-hidden="true"
          className="animate-level-ok-ring pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#6EE7B7]"
        />

        {/* Radiating festive diamond sparkles */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {SPARKS.map((spark, idx) => (
            <span
              key={idx}
              className="animate-level-ok-spark absolute left-0 top-0 block rotate-45 rounded-[2px]"
              style={
                {
                  width: `${spark.size}px`,
                  height: `${spark.size}px`,
                  backgroundColor: spark.color,
                  animationDelay: spark.delay,
                  '--spark-x': spark.x,
                  '--spark-y': spark.y,
                } as CSSProperties
              }
            />
          ))}
        </span>

        {/* Animated Emerald + Gold OK Check Emblem */}
        <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#6EE7B7] bg-gradient-to-b from-[#059669] to-[#065F46] shadow-lg shadow-emerald-950/60">
          <svg
            viewBox="0 0 36 36"
            fill="none"
            className="h-7 w-7 sm:h-8 sm:w-8"
            aria-hidden="true"
          >
            <path
              d="M9 18.8L15.4 25.2L27.5 11.5"
              stroke="#ECFDF5"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-check-draw"
            />
          </svg>
        </div>

        {/* Crisp Status Copy */}
        <div className="relative flex flex-col pr-1">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-[#6EE7B7]">
            {announcement.completedLabel} validé · OK
          </span>
          <span className="text-lg sm:text-2xl font-extrabold uppercase tracking-wide text-[#FFF8EA] leading-tight">
            Niveau réussi !
          </span>
          <span className="mt-0.5 text-xs sm:text-sm font-bold text-[#FDE68A]">
            Cap sur {announcement.nextLabel} ({addedText})
          </span>
        </div>
      </div>
    </div>
  );
}
