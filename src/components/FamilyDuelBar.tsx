import { useEffect, useState } from 'react';
import {
  Award,
  BookmarkCheck,
  Check,
  ClipboardList,
  Cloud,
  CloudOff,
  Eye,
  Home,
  Image as ImageIcon,
  Lock,
  LogIn,
  LogOut,
  Minus,
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

export const LEVEL_SHORT_CODES = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'FIN'] as const;

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

export function getDisplayFamilyName(name: string, fallbackIndex: 0 | 1): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : `FAMILLE N°${fallbackIndex + 1}`;
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

interface FamilyDuelBarProps {
  families: [DuelFamilySlot, DuelFamilySlot];
  currentLevelIndex: number;
  currentLevelLabel: string;
  onSetFamilyLevelResult: (
    id: 0 | 1,
    levelIdx: number,
    status: LevelAttemptStatus,
  ) => void;
}

/**
 * In-game family duel panel: displays the registered Family 1 vs Family 2 names
 * (entered on the HomeScreen) with per-level Réussi/Raté validation.
 */
export function FamilyDuelBar({
  families,
  currentLevelIndex,
  currentLevelLabel,
  onSetFamilyLevelResult,
}: FamilyDuelBarProps) {
  return (
    <section
      aria-label="Les deux familles en duel"
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
              {/* Registered Family Name (Read-only in game) + Score */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#F5B324]/40 bg-[#3B050A] text-[#FCD34D]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="truncate text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA]">
                    {displayName}
                  </h3>
                </div>

                <div
                  className="shrink-0 text-right tabular-nums"
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

              {/* Finger-Friendly Per-Level Validation (Full-Width Large Réussi/Raté + 7-Level Strip) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#FCD34D]">
                    {currentLevelLabel}
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
                        ? 'border-[#6EE7B7] bg-[#065F46] text-[#ECFDF5] shadow-md shadow-emerald-950/50'
                        : 'border-[#6EE7B7]/45 bg-[#3B050A] text-[#FFF8EA] hover:bg-[#4E0910] hover:border-[#6EE7B7]'
                    }`}
                  >
                    <Check
                      className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 stroke-[2.75] ${
                        currentLvlStatus === 'passed' ? 'text-[#6EE7B7]' : 'text-[#6EE7B7]/85'
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
                        title={`${displayName} · ${lvl.label} : ${statusLabel}`}
                        aria-label={`${displayName}, ${lvl.label} : ${statusLabel}`}
                        className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 transition-all active:scale-[0.96] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                          status === 'passed'
                            ? 'border-[#6EE7B7]/75 bg-[#065F46]/80 text-[#ECFDF5]'
                            : status === 'failed'
                              ? 'border-[#FCA5A5]/70 bg-[#7F1D1D]/85 text-[#FEE2E2]'
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
              <div key="family-0-wrapper" className="contents">
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

interface DuelFinishFooterProps {
  families: [DuelFamilySlot, DuelFamilySlot];
  isGameFinished: boolean;
  savedDuelsCount: number;
  saveFeedback: string | null;
  serverUserEmail: string | null;
  isAuthBusy: boolean;
  onSignInServer: () => void;
  onSignOutServer: () => void;
  onSetFamilyOutcome: (id: 0 | 1, outcome: FamilyOutcome) => void;
  onPreviewOutcome: (id: 0 | 1) => void;
  onSaveDuel: () => void;
  onStartNewDuel: () => void;
  onReturnHome?: () => void;
  onOpenHistory: () => void;
  rewardPreview: TortueRewardPreview | null;
  onCloseRewardPreview: () => void;
}

/**
 * Bottom-of-page End-of-Duel & Recording Bar:
 * - Tortue d'Or reward toggles (Image entière / Moitié)
 * - "Enregistrer le duel" button shown prominently at the bottom when the game finishes
 * - "Duel suivant" button that automatically saves into the session (and server when connected)
 * - "Carnet des duels" + 1-click Google server sync
 */
export function DuelFinishFooter({
  families,
  isGameFinished,
  savedDuelsCount,
  saveFeedback,
  serverUserEmail,
  isAuthBusy,
  onSignInServer,
  onSignOutServer,
  onSetFamilyOutcome,
  onPreviewOutcome,
  onSaveDuel,
  onStartNewDuel,
  onReturnHome,
  onOpenHistory,
  rewardPreview,
  onCloseRewardPreview,
}: DuelFinishFooterProps) {
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

  const hasAnyOutcome =
    families[0].outcome !== 'pending' || families[1].outcome !== 'pending';
  const showSaveButton = isGameFinished || hasAnyOutcome;

  return (
    <>
      <footer
        aria-label="Fin de partie et enregistrement du duel"
        className={`w-full rounded-2xl border p-4 sm:p-5 transition-colors ${
          isGameFinished
            ? 'border-[#FCD34D] bg-[#3B050A]/95 shadow-lg shadow-black/35'
            : 'border-[#F5B324]/30 bg-[#2E0408]/90'
        }`}
      >
        {/* Row 1: Compact Tortue d'Or End-of-Duel Reward Pickers */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {families.map((team) => {
            const displayName = getDisplayFamilyName(team.name, team.id);
            const passedCount = countPassedLevels(team.levelResults);

            return (
              <div
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#F5B324]/25 bg-[#240306]/80 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {team.outcome !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => onPreviewOutcome(team.id)}
                      aria-label={`Afficher l'image Tortue d'Or pour ${displayName}`}
                      title="Afficher en grand"
                      className="group relative shrink-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                    >
                      <TortueClueVisual
                        kind={team.outcome}
                        size="thumb"
                        imgBroken={imgBroken}
                        onImgError={() => setImgBroken(true)}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Eye className="h-4 w-4 text-[#FEF08A]" />
                      </span>
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#FFF8EA] truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] font-semibold text-[#F3D9A4]/80 tabular-nums">
                      {passedCount}/{LEVELS.length} niveaux réussis
                      {team.outcome !== 'pending' && (
                        <>
                          <span className="mx-1 text-[#F5B324]/50" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[#FDE68A]">
                            {team.outcome === 'complete' ? 'Image entière' : 'Moitié (½)'}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onSetFamilyOutcome(
                        team.id,
                        team.outcome === 'complete' ? 'pending' : 'complete',
                      )
                    }
                    aria-pressed={team.outcome === 'complete'}
                    className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                      team.outcome === 'complete'
                        ? 'border-[#FEF08A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white'
                        : 'border-[#F5B324]/35 bg-[#4A080F] text-[#FFF8EA] hover:bg-[#6E0D15] hover:border-[#FCD34D]'
                    }`}
                  >
                    <Award className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
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
                    className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                      team.outcome === 'partial'
                        ? 'border-[#FEF08A] bg-gradient-to-b from-[#D97706] to-[#B45309] text-[#220306]'
                        : 'border-[#F5B324]/35 bg-[#4A080F] text-[#FDE68A] hover:bg-[#6E0D15] hover:border-[#FCD34D]'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Moitié (½)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2: Bottom Action Controls (Save when finished + Duel suivant + History + Server Sync) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F5B324]/20 pt-3.5">
          {/* Server sync status / 1-click Google login */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#F3D9A4]">
            {serverUserEmail ? (
              <>
                <Cloud className="h-4 w-4 shrink-0 text-[#6EE7B7]" aria-hidden="true" />
                <span className="text-[#FFF8EA]">
                  Serveur connecté ({serverUserEmail})
                </span>
                <button
                  type="button"
                  onClick={onSignOutServer}
                  disabled={isAuthBusy}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#F5B324]/30 bg-[#3B050A] px-2.5 py-1 text-xs font-bold text-[#F3D9A4] transition-colors hover:border-[#FCD34D] hover:text-[#FFF8EA] cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 shrink-0 text-[#F5B324]/70" aria-hidden="true" />
                <span>Session locale</span>
                <button
                  type="button"
                  onClick={onSignInServer}
                  disabled={isAuthBusy}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#F5B324]/50 bg-[#5E0A12] px-3 py-1.5 text-xs font-extrabold text-[#FDE68A] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] disabled:opacity-50 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Enregistrer sur le serveur (Google)</span>
                </button>
              </>
            )}

            {saveFeedback && (
              <>
                <span className="text-[#F5B324]/45" aria-hidden="true">
                  ·
                </span>
                <span className="font-bold text-[#FDE68A]">{saveFeedback}</span>
              </>
            )}
          </div>

          {/* Primary Bottom Duel Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {showSaveButton && (
              <button
                type="button"
                onClick={onSaveDuel}
                className="animate-lotus-reveal inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-md shadow-black/30 transition-all hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <BookmarkCheck className="h-4 w-4 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                <span>Enregistrer le duel</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStartNewDuel}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/75 bg-[#7F1119] px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#9E1620] hover:border-[#FEF08A] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              <PlusCircle className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Duel suivant</span>
            </button>

            {onReturnHome && (
              <button
                type="button"
                onClick={onReturnHome}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/55 bg-[#5E0A12] px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <Home className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                <span>Accueil</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/50 bg-[#48070D] px-4 py-2.5 text-sm font-extrabold text-[#FDE68A] transition-colors hover:bg-[#6E0D15] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Carnet des duels ({savedDuelsCount})</span>
            </button>
          </div>
        </div>
      </footer>

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
