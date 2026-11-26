import { AlertCircle, Minus, Pause, Play, Plus, RotateCcw, Timer } from 'lucide-react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

interface CountdownBannerProps {
  levelLabel: string;
  levelSeconds: number;
  remainingMs: number;
  status: TimerStatus;
  duelElapsedSec: number;
  duelLimitSec: number;
  onStartOrResume: () => void;
  onPause: () => void;
  onReset: () => void;
  onAdjustLevelSeconds: (deltaSec: number) => void;
}

export function formatCountdown(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  if (clamped > 0 && clamped < 5000) {
    return `${(clamped / 1000).toFixed(1)} s`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatElapsedTime(elapsedSec: number): string {
  const safe = Math.max(0, Math.round(elapsedSec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDurationBadge(seconds: number): string {
  if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m${String(secs).padStart(2, '0')}` : `${secs} s`;
}

export function CountdownBanner({
  levelLabel,
  levelSeconds,
  remainingMs,
  status,
  duelElapsedSec,
  duelLimitSec,
  onStartOrResume,
  onPause,
  onReset,
  onAdjustLevelSeconds,
}: CountdownBannerProps) {
  const totalMs = Math.max(1000, levelSeconds * 1000);
  const progressRatio = Math.min(1, Math.max(0, remainingMs / totalMs));
  const progressPercent = progressRatio * 100;

  const isExpired = status === 'expired';
  const isCritical = !isExpired && status === 'running' && remainingMs <= 5000;
  const isWarning = !isExpired && !isCritical && status === 'running' && remainingMs <= 10000;
  const isDuelOverTime = duelElapsedSec >= duelLimitSec;

  const statusText = isExpired
    ? 'Entraînement terminé'
    : isCritical
      ? 'Dernières secondes'
      : isWarning
        ? 'Fin de l’entraînement bientôt'
        : status === 'running'
          ? 'Entraînement des 2 familles'
          : status === 'paused'
            ? 'Entraînement en pause'
            : `Entraînement · ${formatDurationBadge(levelSeconds)}`;

  const barGradient =
    isExpired || isCritical
      ? 'linear-gradient(90deg, #B91C1C 0%, #EF4444 100%)'
      : isWarning
        ? 'linear-gradient(90deg, #DC2626 0%, #F59E0B 100%)'
        : 'linear-gradient(90deg, #DC2626 0%, #F5B324 58%, #FEF08A 100%)';

  return (
    <div
      role="region"
      aria-label={`Chrono d’entraînement ${levelLabel} — ${formatDurationBadge(levelSeconds)} pour les deux familles`}
      aria-live={isExpired ? 'assertive' : 'off'}
      className={`animate-lotus-reveal mb-2 w-full max-w-[660px] rounded-2xl border-2 px-4 py-2.5 shadow-lg shadow-black/35 backdrop-blur-xs transition-colors ${
        isExpired
          ? 'border-[#EF4444] bg-[#2D0408]/95'
          : isCritical
            ? 'border-[#F87171] bg-[#3B050A]/95'
            : 'border-[#F5B324]/60 bg-[#3B050A]/90'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {isExpired ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-[#F87171]" aria-hidden="true" />
          ) : (
            <Timer
              className={`h-5 w-5 shrink-0 ${
                isCritical ? 'text-[#F87171]' : 'text-[#FCD34D]'
              }`}
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-[#F3D9A4]/85">
              <span className="font-extrabold text-[#FCD34D]">{levelLabel}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  isExpired || isCritical
                    ? 'font-bold text-[#FCA5A5]'
                    : 'text-[#F3D9A4]/80'
                }
              >
                {statusText}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className={`text-2xl sm:text-[1.75rem] font-extrabold leading-tight tabular-nums tracking-tight ${
                  isExpired || isCritical ? 'text-[#FCA5A5]' : 'text-[#FFF8EA]'
                }`}
              >
                {formatCountdown(remainingMs)}
              </span>
              <span
                className={`text-xs font-bold tabular-nums ${
                  isDuelOverTime ? 'text-[#FCA5A5]' : 'text-[#F3D9A4]/75'
                }`}
              >
                Duel {formatElapsedTime(duelElapsedSec)} / {formatElapsedTime(duelLimitSec)}
                {isDuelOverTime ? ' (8 min dépassées)' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'idle' && (
            <div className="inline-flex items-center rounded-xl border border-[#F5B324]/35 bg-[#240306]/85 p-0.5">
              <button
                type="button"
                onClick={() => onAdjustLevelSeconds(-15)}
                disabled={levelSeconds <= 15}
                aria-label="Réduire de 15 secondes"
                title="−15 s"
                className="inline-flex min-h-[38px] min-w-[34px] items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#5E0A12] disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="min-w-[44px] px-1 text-center text-xs font-extrabold text-[#FFF8EA] tabular-nums">
                {formatDurationBadge(levelSeconds)}
              </span>
              <button
                type="button"
                onClick={() => onAdjustLevelSeconds(15)}
                disabled={levelSeconds >= 300}
                aria-label="Ajouter 15 secondes"
                title="+15 s"
                className="inline-flex min-h-[38px] min-w-[34px] items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#5E0A12] disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {status === 'running' ? (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/55 bg-[#5E0A12] px-3 py-2 text-xs sm:text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              <Pause className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartOrResume}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {isExpired ? 'Relancer' : status === 'paused' ? 'Reprendre' : 'Démarrer'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            aria-label="Réinitialiser le chrono d’entraînement"
            title="Réinitialiser le chrono d’entraînement"
            className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-2.5 text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
          >
            <RotateCcw className="h-4 w-4 text-[#FCD34D]" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Smooth Visual Countdown Bar */}
      <div
        className="mt-2.5 h-3 w-full overflow-hidden rounded-full border border-[#F5B324]/25 bg-[#220205]"
        role="progressbar"
        aria-valuenow={Math.ceil(remainingMs / 1000)}
        aria-valuemin={0}
        aria-valuemax={levelSeconds}
        aria-label={`Temps d’entraînement restant pour ${levelLabel} : ${formatCountdown(remainingMs)}`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progressPercent}%`,
            background: barGradient,
            transition: status === 'running' ? 'none' : 'width 180ms ease-out',
          }}
        />
      </div>
    </div>
  );
}
