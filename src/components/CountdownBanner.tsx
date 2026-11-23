import { AlertCircle, Pause, Play, RotateCcw, Timer } from 'lucide-react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

interface CountdownBannerProps {
  levelLabel: string;
  totalSeconds: number;
  remainingMs: number;
  status: TimerStatus;
  onStartOrResume: () => void;
  onPause: () => void;
  onReset: () => void;
}

function formatCountdown(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  if (clamped > 0 && clamped < 5000) {
    return `${(clamped / 1000).toFixed(1)} s`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CountdownBanner({
  levelLabel,
  totalSeconds,
  remainingMs,
  status,
  onStartOrResume,
  onPause,
  onReset,
}: CountdownBannerProps) {
  const totalMs = Math.max(1000, totalSeconds * 1000);
  const progressRatio = Math.min(1, Math.max(0, remainingMs / totalMs));
  const progressPercent = progressRatio * 100;

  const isExpired = status === 'expired';
  const isCritical = !isExpired && status === 'running' && remainingMs <= 5000;
  const isWarning = !isExpired && !isCritical && status === 'running' && progressRatio <= 0.3;

  const statusText = isExpired
    ? 'Temps écoulé'
    : isCritical
      ? 'Dernières secondes'
      : isWarning
        ? 'Accélérez le rythme'
        : status === 'running'
          ? 'Chrono en cours'
          : status === 'paused'
            ? 'En pause'
            : 'Prêt — démarre au lancer';

  const barGradient = isExpired || isCritical
    ? 'linear-gradient(90deg, #B91C1C 0%, #EF4444 100%)'
    : isWarning
      ? 'linear-gradient(90deg, #DC2626 0%, #F59E0B 100%)'
      : 'linear-gradient(90deg, #DC2626 0%, #F5B324 58%, #FEF08A 100%)';

  return (
    <div
      role="region"
      aria-label={`Contre-la-montre ${levelLabel}`}
      aria-live={isExpired ? 'assertive' : 'off'}
      className={`animate-lotus-reveal mb-3 w-full max-w-[540px] rounded-2xl border-2 px-4 py-3 shadow-lg shadow-black/35 backdrop-blur-xs transition-colors ${
        isExpired
          ? 'border-[#EF4444] bg-[#2D0408]/95'
          : isCritical
            ? 'border-[#F87171] bg-[#3B050A]/95'
            : 'border-[#F5B324]/60 bg-[#3B050A]/90'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
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
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F3D9A4]/85">
              <span className="truncate">Contre-la-montre</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  isExpired || isCritical
                    ? 'font-bold text-[#FCA5A5]'
                    : 'text-[#F3D9A4]/75'
                }
              >
                {statusText}
              </span>
            </div>
            <div
              className={`text-2xl sm:text-[1.75rem] font-extrabold leading-tight tabular-nums tracking-tight ${
                isExpired || isCritical ? 'text-[#FCA5A5]' : 'text-[#FFF8EA]'
              }`}
            >
              {formatCountdown(remainingMs)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === 'running' ? (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/55 bg-[#5E0A12] px-3.5 py-2 text-xs sm:text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              <Pause className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartOrResume}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-3.5 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
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
            aria-label="Réinitialiser le compte à rebours"
            title="Réinitialiser le compte à rebours"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-2.5 text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
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
        aria-valuemax={totalSeconds}
        aria-label={`Temps restant : ${formatCountdown(remainingMs)}`}
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
