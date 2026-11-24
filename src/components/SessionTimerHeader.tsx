import { Pause, Play, RotateCcw, Timer } from 'lucide-react';

export const SESSION_RULES_SECONDS = 2 * 60; // 2 min pour expliquer les règles
export const SESSION_PLAY_SECONDS = 6 * 60; // 6 min de jeu
export const SESSION_TOTAL_SECONDS = SESSION_RULES_SECONDS + SESSION_PLAY_SECONDS; // 8 min max

export type SessionTimerStatus = 'idle' | 'running' | 'paused' | 'expired';

interface SessionTimerHeaderProps {
  remainingMs: number;
  status: SessionTimerStatus;
  onTogglePlayPause: () => void;
  onReset: () => void;
}

function formatMinSec(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Shared 8-Minute Session Timer displayed in the header across both the
 * Players' Home Screen and the active Game Screen:
 * - Phase 1 (first 2 min · 08:00 -> 06:00): Règles du jeu
 * - Phase 2 (last 6 min · 06:00 -> 00:00): Temps de jeu
 */
export function SessionTimerHeader({
  remainingMs,
  status,
  onTogglePlayPause,
  onReset,
}: SessionTimerHeaderProps) {
  const totalMs = SESSION_TOTAL_SECONDS * 1000;
  const rulesMs = SESSION_RULES_SECONDS * 1000;
  const playMs = SESSION_PLAY_SECONDS * 1000;

  const clampedMs = Math.max(0, Math.min(totalMs, remainingMs));
  const totalRemainingSec = Math.ceil(clampedMs / 1000);
  const isExpired = status === 'expired' || clampedMs <= 0;
  const isRulesPhase = !isExpired && clampedMs > playMs;
  const isUrgent = !isExpired && clampedMs <= 60_000;

  const rulesRemainingSec = isRulesPhase
    ? Math.ceil((clampedMs - playMs) / 1000)
    : 0;

  // Progress filled in each proportional segment (25% Règles = 2m, 75% Jeu = 6m)
  const elapsedMs = totalMs - clampedMs;
  const rulesFillPct = Math.min(100, Math.max(0, (elapsedMs / rulesMs) * 100));
  const playFillPct =
    elapsedMs <= rulesMs
      ? 0
      : Math.min(100, Math.max(0, ((elapsedMs - rulesMs) / playMs) * 100));

  const isPristine = status === 'idle' && clampedMs === totalMs;

  const phaseText = isExpired
    ? '8 min écoulées'
    : isRulesPhase
      ? `Règles ${formatMinSec(rulesRemainingSec)}`
      : isUrgent
        ? 'Jeu · Dernière min'
        : 'Jeu · 6 min';

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Chrono session 8 minutes : ${formatMinSec(totalRemainingSec)} restantes, ${phaseText}`}
      className={`flex items-center gap-2.5 sm:gap-3 rounded-xl border px-3 py-1.5 shadow-inner transition-colors shrink-0 ${
        isExpired
          ? 'border-[#F87171] bg-[#5C0810]'
          : isUrgent
            ? 'border-[#FCA5A5]/90 bg-[#4A060D]'
            : status === 'running'
              ? 'border-[#FCD34D]/80 bg-[#260306]/95'
              : 'border-[#F5B324]/45 bg-[#240306]/90'
      }`}
    >
      {/* Clock Readout + Phase Breakdown + 2-Segment Proportional Bar (2m / 6m) */}
      <div className="flex flex-col min-w-[168px] sm:min-w-[196px]">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <Timer
              className={`h-4 w-4 shrink-0 ${
                isExpired || isUrgent ? 'text-[#FCA5A5]' : 'text-[#FCD34D]'
              }`}
              aria-hidden="true"
            />
            <span
              className={`text-base sm:text-lg font-extrabold leading-none tracking-tight tabular-nums ${
                isExpired || isUrgent ? 'text-[#FEE2E2]' : 'text-[#FFF8EA]'
              }`}
            >
              {formatMinSec(totalRemainingSec)}
            </span>
          </div>

          <span
            className={`text-[11px] sm:text-xs font-extrabold leading-none tracking-wide tabular-nums whitespace-nowrap ${
              isExpired || isUrgent
                ? 'text-[#FCA5A5]'
                : isRulesPhase
                  ? 'text-[#FCD34D]'
                  : 'text-[#FDE68A]'
            }`}
          >
            {phaseText}
          </span>
        </div>

        {/* 2-Segment Proportional Track: 25% Règles (2 min) | 75% Jeu (6 min) */}
        <div
          className="mt-1.5 flex w-full items-center gap-1"
          title="2 min d'explication des règles + 6 min de jeu (8 min max)"
          aria-hidden="true"
        >
          <div className="h-1.5 w-1/4 overflow-hidden rounded-full bg-[#4A0B12]">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${rulesFillPct}%`,
                backgroundColor: isRulesPhase ? '#FCD34D' : '#F5B324',
              }}
            />
          </div>
          <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-[#4A0B12]">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${playFillPct}%`,
                background:
                  isExpired || isUrgent
                    ? '#EF4444'
                    : 'linear-gradient(90deg, #DC2626 0%, #F5B324 100%)',
              }}
            />
          </div>
        </div>

        <div className="mt-0.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#F3D9A4]/60 tabular-nums">
          <span>2m règles</span>
          <span>6m jeu</span>
        </div>
      </div>

      {/* Play / Pause & Reset Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onTogglePlayPause}
          aria-label={
            status === 'running'
              ? 'Mettre le chrono 8 minutes en pause'
              : isExpired
                ? 'Relancer le chrono 8 minutes'
                : 'Démarrer le chrono 8 minutes'
          }
          title={
            status === 'running'
              ? 'Pause (chrono 8 min)'
              : isExpired
                ? 'Relancer 8 min'
                : 'Démarrer le chrono 8 min'
          }
          className={`inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
            status === 'running'
              ? 'border-[#FCD34D] bg-[#F5B324] text-[#2B0508] hover:bg-[#FCD34D]'
              : 'border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white hover:from-[#EF2D2D] hover:to-[#B91C1C]'
          }`}
        >
          {status === 'running' ? (
            <Pause className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={isPristine}
          aria-label="Réinitialiser le chrono 8 minutes"
          title="Réinitialiser à 08:00 (2 min règles + 6 min jeu)"
          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-[#F5B324]/40 bg-[#4A070E] text-[#FCD34D] transition-colors hover:bg-[#6E0D15] hover:border-[#FCD34D] disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
