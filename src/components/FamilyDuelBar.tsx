import { useEffect, useState } from 'react';
import {
  Award,
  BookmarkCheck,
  Check,
  ClipboardList,
  Eye,
  Image as ImageIcon,
  Lock,
  Minus,
  Pencil,
  PlusCircle,
  Swords,
  Users,
  X,
} from 'lucide-react';
import tortueDorImg from '../assets/images/tortue_dor_indice_1795462901441.jpg';
import { LEVELS } from '../game/mudras';
import { formatElapsedTime } from './CountdownBanner';

export type FamilyOutcome = 'pending' | 'complete' | 'partial';
export type LevelAttemptStatus = 'pending' | 'passed' | 'failed';

export const LEVEL_SHORT_CODES = ['N1', 'N2', 'N3', 'N4', 'N5', 'FIN'] as const;

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

export interface DuelFamilySlot {
  id: 0 | 1;
  name: string;
  outcome: FamilyOutcome;
  /** Per-level challenge status (index 0..5 matching LEVELS) */
  levelResults: LevelAttemptStatus[];
  /** Number of mudras reached when outcome was recorded (0..7) */
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

interface FamilyDuelBarProps {
  families: [DuelFamilySlot, DuelFamilySlot];
  currentLevelIndex: number;
  currentLevelLabel: string;
  savedDuelsCount: number;
  saveFeedback: string | null;
  onRenameFamily: (id: 0 | 1, name: string) => void;
  onSetFamilyLevelResult: (
    id: 0 | 1,
    levelIdx: number,
    status: LevelAttemptStatus,
  ) => void;
  onSetFamilyOutcome: (id: 0 | 1, outcome: FamilyOutcome) => void;
  onPreviewOutcome: (id: 0 | 1) => void;
  onSaveDuel: () => void;
  onStartNewDuel: () => void;
  onOpenHistory: () => void;
  rewardPreview: TortueRewardPreview | null;
  onCloseRewardPreview: () => void;
}

export function getDisplayFamilyName(name: string, fallbackIndex: 0 | 1): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : `FAMILLE ${fallbackIndex + 1}`;
}

export function getOutcomeLabel(outcome: FamilyOutcome): string {
  if (outcome === 'complete') return 'Réussite complète · Image entière';
  if (outcome === 'partial') return 'Réussite partielle · Moitié d’image';
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
                Réussite partielle (½ image)
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

export function FamilyDuelBar({
  families,
  currentLevelIndex,
  currentLevelLabel,
  savedDuelsCount,
  saveFeedback,
  onRenameFamily,
  onSetFamilyLevelResult,
  onSetFamilyOutcome,
  onPreviewOutcome,
  onSaveDuel,
  onStartNewDuel,
  onOpenHistory,
  rewardPreview,
  onCloseRewardPreview,
}: FamilyDuelBarProps) {
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (!rewardPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRewardPreview();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rewardPreview, onCloseRewardPreview]);

  const canSaveDuel =
    families[0].name.trim().length > 0 ||
    families[1].name.trim().length > 0 ||
    families[0].outcome !== 'pending' ||
    families[1].outcome !== 'pending' ||
    countEvaluatedLevels(families[0].levelResults) > 0 ||
    countEvaluatedLevels(families[1].levelResults) > 0;

  return (
    <>
      <section
        aria-label="Duel simultané des deux familles pour la Tortue d'Or"
        className="w-full"
      >
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
          {families.map((team, idx) => {
            const displayName = getDisplayFamilyName(team.name, team.id);
            const currentLvlStatus = team.levelResults[currentLevelIndex] ?? 'pending';
            const passedCount = countPassedLevels(team.levelResults);
            const allLevelsPassed = passedCount === LEVELS.length;

            const teamCard = (
              <div
                key={team.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                  team.outcome === 'complete'
                    ? 'border-[#FCD34D] bg-[#48070D]/95 shadow-md shadow-black/30'
                    : team.outcome === 'partial'
                      ? 'border-[#F59E0B]/70 bg-[#42070C]/92 shadow-sm shadow-black/25'
                      : 'border-[#F5B324]/40 bg-[#3B050A]/88 shadow-sm shadow-black/20'
                }`}
              >
                {/* Row 1: Editable Family Name + Live Per-Level Tally */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F5B324]/40 bg-[#240306]/85 text-[#FCD34D]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <label htmlFor={`family-name-${team.id}`} className="sr-only">
                      Nom de la famille {team.id + 1}
                    </label>
                    <input
                      id={`family-name-${team.id}`}
                      type="text"
                      value={team.name}
                      maxLength={32}
                      onChange={(e) => onRenameFamily(team.id, e.target.value)}
                      placeholder={`NOM FAMILLE ${team.id + 1}`}
                      className="min-h-[42px] w-full rounded-xl border border-[#F5B324]/35 bg-[#240306]/85 py-1.5 pl-3 pr-8 text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA] placeholder:text-[#F3D9A4]/45 transition-colors focus:border-[#FCD34D] focus:bg-[#2E0408] focus:outline-none focus:ring-2 focus:ring-[#FCD34D]/50"
                    />
                    <Pencil
                      className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#F5B324]/65"
                      aria-hidden="true"
                    />
                  </div>
                  <div
                    className="shrink-0 text-right tabular-nums"
                    title={`${passedCount} niveaux réussis sur ${LEVELS.length}`}
                  >
                    <span className="text-sm sm:text-base font-extrabold text-[#FCD34D]">
                      {passedCount}
                    </span>
                    <span className="text-xs font-bold text-[#F3D9A4]/70">
                      /{LEVELS.length}
                    </span>
                  </div>
                </div>

                {/* Row 2: Per-Level Challenge Pass/Fail Controls for This Team */}
                <div className="mt-3 border-t border-[#F5B324]/20 pt-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#F3D9A4]">
                      Défi · <span className="text-[#FFF8EA]">{currentLevelLabel}</span>
                    </span>
                    <span
                      className={`font-extrabold ${
                        currentLvlStatus === 'passed'
                          ? 'text-[#6EE7B7]'
                          : currentLvlStatus === 'failed'
                            ? 'text-[#FCA5A5]'
                            : 'text-[#F3D9A4]/65'
                      }`}
                    >
                      {currentLvlStatus === 'passed'
                        ? 'Réussi'
                        : currentLvlStatus === 'failed'
                          ? 'Raté'
                          : 'À valider'}
                    </span>
                  </div>

                  {/* Direct Réussi / Raté buttons for the active level */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
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
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                        currentLvlStatus === 'passed'
                          ? 'border-[#6EE7B7] bg-[#065F46] text-[#ECFDF5] shadow-sm'
                          : 'border-[#F5B324]/35 bg-[#260306]/90 text-[#FFF8EA] hover:bg-[#3A070C] hover:border-[#6EE7B7]/80'
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          currentLvlStatus === 'passed' ? 'text-[#6EE7B7]' : 'text-[#6EE7B7]/80'
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
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                        currentLvlStatus === 'failed'
                          ? 'border-[#FCA5A5] bg-[#7F1D1D] text-[#FEF2F2] shadow-sm'
                          : 'border-[#F5B324]/35 bg-[#260306]/90 text-[#F3D9A4] hover:bg-[#3A070C] hover:border-[#FCA5A5]/80'
                      }`}
                    >
                      <X
                        className={`h-4 w-4 shrink-0 ${
                          currentLvlStatus === 'failed' ? 'text-[#FCA5A5]' : 'text-[#F87171]/80'
                        }`}
                        aria-hidden="true"
                      />
                      <span>Raté</span>
                    </button>
                  </div>

                  {/* Interactive 6-Level Per-Team Tracker Strip (tap any level to toggle/correct) */}
                  <div
                    className="mt-2 grid grid-cols-6 gap-1.5"
                    role="group"
                    aria-label={`Suivi par niveau de ${displayName}`}
                  >
                    {LEVELS.map((lvl) => {
                      const status = team.levelResults[lvl.index] ?? 'pending';
                      const isCurrent = lvl.index === currentLevelIndex;
                      const shortCode = LEVEL_SHORT_CODES[lvl.index] ?? `N${lvl.index + 1}`;
                      const statusLabel =
                        status === 'passed'
                          ? 'Réussi'
                          : status === 'failed'
                            ? 'Raté'
                            : 'En attente';

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
                          title={`${displayName} · ${lvl.label} : ${statusLabel} (cliquer pour modifier)`}
                          aria-label={`${displayName}, ${lvl.label} : ${statusLabel}. Cliquer pour changer`}
                          className={`flex min-h-[40px] flex-col items-center justify-center rounded-lg border px-1 py-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                            status === 'passed'
                              ? 'border-[#6EE7B7]/75 bg-[#065F46]/80 text-[#ECFDF5]'
                              : status === 'failed'
                                ? 'border-[#FCA5A5]/70 bg-[#7F1D1D]/85 text-[#FEE2E2]'
                                : 'border-[#F5B324]/25 bg-[#240306]/80 text-[#F3D9A4]/70 hover:border-[#F5B324]/60 hover:text-[#FFF8EA]'
                          } ${isCurrent ? 'ring-2 ring-[#FCD34D] ring-offset-1 ring-offset-[#3B050A]' : ''}`}
                        >
                          <span className="text-[10px] font-extrabold leading-none tracking-tight tabular-nums">
                            {shortCode}
                          </span>
                          <span className="mt-1 flex items-center justify-center">
                            {status === 'passed' ? (
                              <Check className="h-3.5 w-3.5 text-[#6EE7B7]" aria-hidden="true" />
                            ) : status === 'failed' ? (
                              <X className="h-3.5 w-3.5 text-[#FCA5A5]" aria-hidden="true" />
                            ) : (
                              <Minus className="h-3 w-3 opacity-45" aria-hidden="true" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Final Tortue d'Or Reward (Image entière / Moitié) */}
                <div className="mt-3 border-t border-[#F5B324]/18 pt-3">
                  <div className="flex items-center justify-between gap-2.5 min-h-[44px]">
                    {team.outcome === 'pending' ? (
                      <p className="text-xs font-medium text-[#F3D9A4]/80">
                        {allLevelsPassed ? (
                          <span className="font-bold text-[#FDE68A]">
                            6/6 défis réussis · Prêt pour l’image entière
                          </span>
                        ) : (
                          'Tortue d’Or · Choisissez l’image à remettre en fin de duel'
                        )}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TortueClueVisual
                            kind={team.outcome}
                            size="thumb"
                            imgBroken={imgBroken}
                            onImgError={() => setImgBroken(true)}
                          />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-extrabold text-[#FDE68A] truncate">
                              {team.outcome === 'complete'
                                ? 'Complète · Image entière'
                                : 'Partielle · Moitié d’image'}
                            </div>
                            {(team.mudrasReached !== null || team.elapsedSec !== null) && (
                              <div className="text-[11px] font-semibold text-[#F3D9A4]/80 tabular-nums">
                                {team.mudrasReached !== null && `${team.mudrasReached}/7 mudras`}
                                {team.mudrasReached !== null && team.elapsedSec !== null && ' · '}
                                {team.elapsedSec !== null && formatElapsedTime(team.elapsedSec)}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onPreviewOutcome(team.id)}
                          aria-label={`Afficher la carte Tortue d'Or pour ${displayName}`}
                          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3 py-1.5 text-xs font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#FCD34D]" aria-hidden="true" />
                          <span>Voir</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSetFamilyOutcome(
                          team.id,
                          team.outcome === 'complete' ? 'pending' : 'complete',
                        )
                      }
                      aria-pressed={team.outcome === 'complete'}
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                        team.outcome === 'complete'
                          ? 'border-[#FEF08A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white shadow-sm'
                          : 'border-[#F5B324]/45 bg-[#5E0A12] text-[#FFF8EA] hover:bg-[#7A1019] hover:border-[#FCD34D]'
                      }`}
                    >
                      <Award
                        className={`h-4 w-4 shrink-0 ${
                          team.outcome === 'complete' ? 'text-[#FEF08A]' : 'text-[#FCD34D]'
                        }`}
                        aria-hidden="true"
                      />
                      <span>Image entière</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSetFamilyOutcome(
                          team.id,
                          team.outcome === 'partial' ? 'pending' : 'partial',
                        )
                      }
                      aria-pressed={team.outcome === 'partial'}
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                        team.outcome === 'partial'
                          ? 'border-[#FEF08A] bg-gradient-to-b from-[#D97706] to-[#B45309] text-[#220306] shadow-sm'
                          : 'border-[#F5B324]/45 bg-[#5E0A12] text-[#FDE68A] hover:bg-[#7A1019] hover:border-[#FCD34D]'
                      }`}
                    >
                      <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Moitié (½)</span>
                    </button>
                  </div>
                </div>
              </div>
            );

            if (idx === 0) {
              return (
                <div key="family-0-wrapper" className="contents">
                  {teamCard}

                  {/* Center CONTRE Emblem */}
                  <div className="flex items-center justify-center py-0.5 md:px-1">
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#F5B324]/55 bg-[#2C0408]/95 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-[#FCD34D] shadow-sm md:flex-col md:gap-1.5 md:px-3 md:py-4">
                      <Swords className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                      <span>CONTRE</span>
                    </div>
                  </div>
                </div>
              );
            }

            return teamCard;
          })}
        </div>

        {/* Unified Duel Recording & History Action Strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#F5B324]/30 bg-[#2E0408]/88 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-[#F3D9A4]">
            <span className="font-extrabold uppercase text-[#FFF8EA]">
              {getDisplayFamilyName(families[0].name, 0)}
            </span>
            <span className="text-[#FCD34D] font-bold">CONTRE</span>
            <span className="font-extrabold uppercase text-[#FFF8EA]">
              {getDisplayFamilyName(families[1].name, 1)}
            </span>
            <span className="text-[#F5B324]/50" aria-hidden="true">
              ·
            </span>
            <span className="text-[#F3D9A4]/80">
              {saveFeedback ?? 'Jeu en simultané · 1 min par niveau'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSaveDuel}
              disabled={!canSaveDuel}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-3.5 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              <BookmarkCheck className="h-4 w-4 shrink-0 text-[#FDE68A]" aria-hidden="true" />
              <span>Enregistrer le duel</span>
            </button>

            <button
              type="button"
              onClick={onStartNewDuel}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3.5 py-2 text-xs sm:text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              <PlusCircle className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Duel suivant</span>
            </button>

            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/55 bg-[#48070D] px-3.5 py-2 text-xs sm:text-sm font-extrabold text-[#FDE68A] transition-colors hover:bg-[#6E0D15] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Carnet des duels ({savedDuelsCount})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Celebratory Golden Turtle Clue Reveal Modal */}
      {rewardPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0204]/80 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tortue-reward-title"
          onClick={onCloseRewardPreview}
        >
          <div
            className="animate-lotus-reveal relative w-full max-w-lg rounded-2xl border-2 border-[#FCD34D] bg-[#3B050A] p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onCloseRewardPreview}
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
                    ? 'Réussite complète · Image entière'
                    : 'Réussite partielle · Moitié d’image'}
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
                  ? 'Gagne l’image entière pour trouver la Tortue d’Or !'
                  : 'Reçoit la moitié de l’image pour trouver la Tortue d’Or.'}
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
                <span>Performance enregistrée</span>
                <span className="font-extrabold text-[#FCD34D]">
                  {rewardPreview.mudrasReached !== null &&
                    `${rewardPreview.mudrasReached}/7 mudras`}
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
                onClick={onCloseRewardPreview}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
