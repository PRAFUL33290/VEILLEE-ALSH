import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Eye,
  Lock,
  Minus,
  Swords,
  Users,
  X,
} from 'lucide-react';
import tortueDorImg from '../assets/images/tortue_dor_indice_1795462901441.jpg';
import { LEVELS } from '../game/mudras';
import { formatElapsedTime } from './CountdownBanner';

export type FamilyOutcome = 'pending' | 'complete' | 'partial';
export type LevelAttemptStatus = 'pending' | 'passed' | 'failed';

export const LEVEL_SHORT_CODES = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'] as const;

export function createEmptyLevelResults(): LevelAttemptStatus[] {
  return LEVELS.map(() => 'pending');
}

export function sanitizeLevelResults(value: unknown): LevelAttemptStatus[] {
  if (!Array.isArray(value)) return createEmptyLevelResults();
  return LEVELS.map((_, idx) => {
    const item = value[idx];
    if (item === 'passed' || item === 'failed' || item === 'pending') return item;
    return 'pending';
  });
}

export function countPassedLevels(results: readonly LevelAttemptStatus[]): number {
  return results.filter((r) => r === 'passed').length;
}

export function countEvaluatedLevels(results: readonly LevelAttemptStatus[]): number {
  return results.filter((r) => r !== 'pending').length;
}

export function getNextCycledLevelStatus(current: LevelAttemptStatus): LevelAttemptStatus {
  if (current === 'pending') return 'passed';
  if (current === 'passed') return 'failed';
  return 'pending';
}

/**
 * Reward milestone rule on the 7 levels:
 * - Level 7 (index 6) passed => full image ('complete')
 * - Level 4 (index 3) reached/passed (or >= 4 passed levels) => half image ('partial')
 * - Otherwise => 'pending'
 */
export function deriveTeamOutcomeFromLevels(results: readonly LevelAttemptStatus[]): FamilyOutcome {
  if (results[6] === 'passed') return 'complete';
  if (results[3] === 'passed' || countPassedLevels(results) >= 4) return 'partial';
  return 'pending';
}

export interface DuelFamilySlot {
  id: 0 | 1;
  name: string;
  outcome: FamilyOutcome;
  /** Per-level challenge status (index 0..6 matching LEVELS) */
  levelResults: LevelAttemptStatus[];
  /** Number of mudras reached when outcome was recorded (0..11) */
  mudrasReached: number | null;
  /** Total duel elapsed seconds when outcome was recorded */
  elapsedSec: number | null;
}

export interface SavedDuelFamilyEntry {
  name: string;
  outcome: FamilyOutcome;
  levelResults: LevelAttemptStatus[];
  mudrasReached: number | null;
  elapsedSec: number | null;
}

export interface SavedDuelRecord {
  id: string;
  duelNumber: number;
  recordedAtIso: string;
  familyA: SavedDuelFamilyEntry;
  familyB: SavedDuelFamilyEntry;
}

export interface TortueRewardPreview {
  familyName: string;
  outcome: 'complete' | 'partial';
  mudrasReached: number | null;
  elapsedSec: number | null;
}

export function getDisplayFamilyName(_name: string, fallbackIndex: 0 | 1): string {
  return fallbackIndex === 0 ? 'TEAM 1' : 'TEAM 2';
}

export function getOutcomeLabel(outcome: FamilyOutcome): string {
  if (outcome === 'complete') return 'Niveau 7 · Image entière';
  if (outcome === 'partial') return 'Niveau 4 · Moitié d’image (½)';
  return 'En cours';
}

function GoldenTurtleFallbackSVG({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="160" height="120" fill="#2A0408" />
      <circle cx="80" cy="60" r="46" fill="#F5B324" opacity="0.16" />
      <ellipse cx="76" cy="70" rx="34" ry="20" fill="#D97706" stroke="#FDE68A" strokeWidth="2.5" />
      <path
        d="M44 68 C48 40, 104 40, 108 68 Z"
        fill="#F5B324"
        stroke="#FEF08A"
        strokeWidth="2.5"
      />
      <circle cx="76" cy="57" r="6" fill="#DC2626" stroke="#FEF08A" strokeWidth="1.5" />
      <circle cx="60" cy="61" r="4" fill="#DC2626" stroke="#FEF08A" strokeWidth="1.2" />
      <circle cx="92" cy="61" r="4" fill="#DC2626" stroke="#FEF08A" strokeWidth="1.2" />
      <ellipse cx="117" cy="66" rx="11" ry="8" fill="#F5B324" stroke="#FEF08A" strokeWidth="2" />
      <circle cx="121" cy="64" r="2" fill="#7F1119" />
      <rect x="52" y="82" width="12" height="10" rx="4" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
      <rect x="88" y="82" width="12" height="10" rx="4" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Renders either a full (100%) or half (50% split) visual clue card for the Tortue d'Or.
 */
export function TortueClueVisual({
  kind,
  size = 'thumb',
  imgBroken,
  onImgError,
}: {
  kind: 'complete' | 'partial';
  size?: 'thumb' | 'modal';
  imgBroken: boolean;
  onImgError: () => void;
}) {
  const isModal = size === 'modal';

  return (
    <div
      className={`relative overflow-hidden border ${
        isModal
          ? 'aspect-[4/3] w-full rounded-2xl border-2 border-[#FCD34D] shadow-2xl shadow-black/50'
          : 'h-10 w-13 shrink-0 rounded-lg border-[#F5B324]/80 shadow-xs'
      } bg-[#240306]`}
    >
      {imgBroken ? (
        <GoldenTurtleFallbackSVG />
      ) : (
        <img
          src={tortueDorImg}
          alt={
            kind === 'complete'
              ? "Image entière d'indice pour trouver la Tortue d'Or"
              : "Moitié d'image d'indice pour trouver la Tortue d'Or"
          }
          referrerPolicy="no-referrer"
          onError={onImgError}
          className="h-full w-full object-cover"
        />
      )}

      {kind === 'partial' && (
        <div
          className="absolute inset-y-0 right-0 flex w-1/2 flex-col items-center justify-center border-l-2 border-dashed border-[#FCD34D] bg-[#2D0408]/95 backdrop-blur-xs"
          aria-hidden="true"
        >
          {isModal ? (
            <div className="flex flex-col items-center gap-2 px-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#F5B324]/60 bg-[#4A080F]">
                <Lock className="h-5 w-5 text-[#FCD34D]" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FDE68A]">
                Moitié masquée
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-[#F3D9A4]/75">
                Palier Niveau 4 (½ image)
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-extrabold text-[#FCD34D] tabular-nums">
              ½
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface FamilyDuelBarProps {
  families: [DuelFamilySlot, DuelFamilySlot];
  currentLevelIndex: number;
  currentLevelLabel: string;
  onSetFamilyLevelResult: (
    id: 0 | 1,
    levelIdx: number,
    status: LevelAttemptStatus,
  ) => void;
  onPreviewOutcome?: (id: 0 | 1) => void;
}

/**
 * In-game duel panel: Team 1 vs Team 2 with finger-friendly per-level Réussi/Raté validation
 * and automatic Level 4 (½ image) / Level 7 (full image) Tortue d'Or reward indicators.
 */
export function FamilyDuelBar({
  families,
  currentLevelIndex,
  currentLevelLabel,
  onSetFamilyLevelResult,
  onPreviewOutcome,
}: FamilyDuelBarProps) {
  return (
    <section
      aria-label="Team 1 contre Team 2"
      className="w-full rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-4 shadow-md shadow-black/25 backdrop-blur-xs"
    >
      <div className="flex flex-col gap-2.5">
        {families.map((team, idx) => {
          const displayName = getDisplayFamilyName(team.name, team.id);
          const currentLvlStatus = team.levelResults[currentLevelIndex] ?? 'pending';
          const passedCount = countPassedLevels(team.levelResults);

          const teamCard = (
            <div
              key={team.id}
              className="flex flex-col gap-2.5 rounded-xl border border-[#F5B324]/25 bg-[#260306]/75 p-3"
            >
              {/* Team Header + Unlocked Reward Quick Preview + Score */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#F5B324]/40 bg-[#3B050A] text-[#FCD34D]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="truncate text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA]">
                    {displayName}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {team.outcome !== 'pending' && onPreviewOutcome && (
                    <button
                      type="button"
                      onClick={() => onPreviewOutcome(team.id)}
                      title={`Afficher l'image Tortue d'Or pour ${displayName}`}
                      className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap ${
                        team.outcome === 'complete'
                          ? 'border-[#FEF08A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white hover:from-[#EF2D2D] hover:to-[#B91C1C]'
                          : 'border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{team.outcome === 'complete' ? 'Image entière' : 'Moitié (½)'}</span>
                    </button>
                  )}

                  <div
                    className="text-right tabular-nums"
                    title={`${passedCount} niveaux réussis sur ${LEVELS.length}`}
                  >
                    <span className="text-sm font-extrabold text-[#FCD34D]">
                      {passedCount}
                    </span>
                    <span className="text-xs font-bold text-[#F3D9A4]/70">
                      /{LEVELS.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Finger-Friendly Per-Level Validation (Full-Width Large Réussi/Raté + 7-Level Strip) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#FCD34D] tabular-nums">
                    {currentLevelLabel} - {LEVELS[currentLevelIndex]?.targetCount ?? 0} Mudras
                  </span>
                  <span className="text-[11px] font-bold text-[#F3D9A4]/75">
                    {currentLvlStatus === 'passed'
                      ? 'Validé : Réussi'
                      : currentLvlStatus === 'failed'
                        ? 'Validé : Raté'
                        : 'En attente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSetFamilyLevelResult(
                        team.id,
                        currentLevelIndex,
                        currentLvlStatus === 'passed' ? 'pending' : 'passed',
                      )
                    }
                    aria-pressed={currentLvlStatus === 'passed'}
                    className={`inline-flex min-h-[60px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-base sm:text-lg font-extrabold uppercase tracking-wide transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                      currentLvlStatus === 'passed'
                        ? 'animate-ok-pop border-[#6EE7B7] bg-[#065F46] text-[#ECFDF5] shadow-md shadow-emerald-950/50'
                        : 'border-[#6EE7B7]/45 bg-[#3B050A] text-[#FFF8EA] hover:bg-[#4E0910] hover:border-[#6EE7B7]'
                    }`}
                  >
                    <Check
                      key={currentLvlStatus === 'passed' ? `ok-${team.id}-${currentLevelIndex}` : 'idle'}
                      className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 stroke-[2.75] ${
                        currentLvlStatus === 'passed'
                          ? 'animate-ok-pop text-[#6EE7B7]'
                          : 'text-[#6EE7B7]/85'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Réussi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSetFamilyLevelResult(
                        team.id,
                        currentLevelIndex,
                        currentLvlStatus === 'failed' ? 'pending' : 'failed',
                      )
                    }
                    aria-pressed={currentLvlStatus === 'failed'}
                    className={`inline-flex min-h-[60px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-base sm:text-lg font-extrabold uppercase tracking-wide transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                      currentLvlStatus === 'failed'
                        ? 'border-[#FCA5A5] bg-[#991B1B] text-[#FEF2F2] shadow-md shadow-red-950/50'
                        : 'border-[#FCA5A5]/40 bg-[#3B050A] text-[#F3D9A4] hover:bg-[#4E0910] hover:border-[#FCA5A5]'
                    }`}
                  >
                    <X
                      className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 stroke-[2.75] ${
                        currentLvlStatus === 'failed' ? 'text-[#FCA5A5]' : 'text-[#F87171]/85'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Raté</span>
                  </button>
                </div>

                <div
                  className="grid grid-cols-7 gap-1.5 pt-0.5"
                  role="group"
                  aria-label={`Suivi par niveau de ${displayName}`}
                >
                  {LEVELS.map((lvl) => {
                    const status = team.levelResults[lvl.index] ?? 'pending';
                    const isCurrent = lvl.index === currentLevelIndex;
                    const isHalfMilestone = lvl.index === 3;
                    const isFullMilestone = lvl.index === 6;
                    const shortCode = LEVEL_SHORT_CODES[lvl.index] ?? `N${lvl.index + 1}`;
                    const statusLabel =
                      status === 'passed'
                        ? 'Réussi'
                        : status === 'failed'
                          ? 'Raté'
                          : 'En attente';
                    const milestoneHint = isHalfMilestone
                      ? ' (Palier ½ image)'
                      : isFullMilestone
                        ? ' (Palier image entière)'
                        : '';

                    return (
                      <button
                        key={lvl.index}
                        type="button"
                        onClick={() =>
                          onSetFamilyLevelResult(
                            team.id,
                            lvl.index,
                            getNextCycledLevelStatus(status),
                          )
                        }
                        title={`${displayName} · ${lvl.label}${milestoneHint} : ${statusLabel}`}
                        aria-label={`${displayName}, ${lvl.label}${milestoneHint} : ${statusLabel}`}
                        className={`flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 transition-all active:scale-[0.96] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                          status === 'passed'
                            ? 'border-[#6EE7B7]/75 bg-[#065F46]/80 text-[#ECFDF5]'
                            : status === 'failed'
                              ? 'border-[#FCA5A5]/70 bg-[#7F1D1D]/85 text-[#FEE2E2]'
                              : isHalfMilestone || isFullMilestone
                                ? 'border-[#F5B324]/55 bg-[#2A0408] text-[#FDE68A] hover:border-[#FCD34D] hover:text-[#FFF8EA]'
                                : 'border-[#F5B324]/25 bg-[#1E0205] text-[#F3D9A4]/75 hover:border-[#F5B324]/60 hover:text-[#FFF8EA]'
                        } ${isCurrent ? 'ring-2 ring-[#FCD34D] ring-offset-1 ring-offset-[#260306]' : ''}`}
                      >
                        <span className="text-[11px] font-extrabold leading-none tabular-nums">
                          {shortCode}
                        </span>
                        {status === 'passed' ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[#6EE7B7] stroke-[2.75]" aria-hidden="true" />
                        ) : status === 'failed' ? (
                          <X className="h-3.5 w-3.5 shrink-0 text-[#FCA5A5] stroke-[2.75]" aria-hidden="true" />
                        ) : isHalfMilestone ? (
                          <span className="text-[10px] font-extrabold leading-none text-[#FCD34D] tabular-nums">
                            ½
                          </span>
                        ) : isFullMilestone ? (
                          <Award className="h-3 w-3 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                        ) : (
                          <Minus className="h-3 w-3 shrink-0 opacity-45" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );

          if (idx === 0) {
            return (
              <div key="team-0-wrapper" className="contents">
                {teamCard}

                {/* Sleek Horizontal CONTRE Divider */}
                <div className="flex items-center gap-3 px-1">
                  <div className="h-px flex-1 bg-[#F5B324]/25" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#FCD34D]">
                    <Swords className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>CONTRE</span>
                  </span>
                  <div className="h-px flex-1 bg-[#F5B324]/25" aria-hidden="true" />
                </div>
              </div>
            );
          }

          return teamCard;
        })}
      </div>
    </section>
  );
}

interface TortueRewardModalProps {
  rewardPreview: TortueRewardPreview | null;
  onClose: () => void;
}

/**
 * Celebratory Golden Turtle Clue Reveal Modal triggered from Team 1 / Team 2 reward badges
 * once Level 4 (½ image) or Level 7 (full image) is unlocked.
 */
export function TortueRewardModal({
  rewardPreview,
  onClose,
}: TortueRewardModalProps) {
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (!rewardPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rewardPreview, onClose]);

  if (!rewardPreview) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0204]/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tortue-reward-title"
      onClick={onClose}
    >
      <div
        className="animate-lotus-reveal relative w-full max-w-lg rounded-2xl border-2 border-[#FCD34D] bg-[#3B050A] p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la carte Tortue d'Or"
          className="absolute right-4 top-4 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[#F5B324]/35 bg-[#5E0A12] text-[#F3D9A4] transition-colors hover:bg-[#7A1019] hover:text-[#FFF8EA] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pr-10">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FCD34D]">
            <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {rewardPreview.outcome === 'complete'
                ? 'Niveau 7 atteint · Image entière'
                : 'Niveau 4 atteint · Moitié de l’image (½)'}
            </span>
          </div>

          <h2
            id="tortue-reward-title"
            className="mt-1 text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-[#FFF8EA]"
          >
            {rewardPreview.familyName}
          </h2>

          <p className="mt-1 text-sm font-semibold text-[#FDE68A]">
            {rewardPreview.outcome === 'complete'
              ? 'Remporte le défi et gagne l’image entière pour trouver la Tortue d’Or !'
              : 'Atteint le niveau 4 et reçoit la moitié de l’image pour trouver la Tortue d’Or.'}
          </p>
        </div>

        <div className="mt-4">
          <TortueClueVisual
            kind={rewardPreview.outcome}
            size="modal"
            imgBroken={imgBroken}
            onImgError={() => setImgBroken(true)}
          />
        </div>

        {(rewardPreview.mudrasReached !== null || rewardPreview.elapsedSec !== null) && (
          <div className="mt-4 flex items-center justify-between border-t border-[#F5B324]/25 pt-3.5 text-sm font-bold text-[#F3D9A4] tabular-nums">
            <span>Performance du défi</span>
            <span className="font-extrabold text-[#FCD34D]">
              {rewardPreview.mudrasReached !== null &&
                `${rewardPreview.mudrasReached}/${LEVELS[LEVELS.length - 1].targetCount} mudras`}
              {rewardPreview.mudrasReached !== null &&
                rewardPreview.elapsedSec !== null &&
                ' · '}
              {rewardPreview.elapsedSec !== null &&
                formatElapsedTime(rewardPreview.elapsedSec)}
            </span>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
