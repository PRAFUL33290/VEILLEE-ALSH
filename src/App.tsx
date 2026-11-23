import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Volume2, VolumeX } from 'lucide-react';
import {
  LEVELS,
  MUDRAS,
  MudraSector,
  SECTOR_COUNT,
  SequenceEntry,
  getUniformRandomFloat,
  getUniformRandomInt,
} from './game/mudras';
import { MudraSpriteAsset, loadMudraSprites } from './game/mudraSprites';
import { mudraAudio } from './game/audio';
import { MudraWheel3D, MudraWheelHandle } from './components/MudraWheel3D';
import { CelebrationOverlay } from './components/CelebrationOverlay';

interface DuplicateNotice {
  mudra: MudraSector;
  phase: 'countdown' | 'respinning';
}

function LotusEmblem({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Back petals */}
      <path
        d="M32 10C25 20 22 31 32 45C42 31 39 20 32 10Z"
        fill="#DC2626"
      />
      <path
        d="M15 20C14 31 19 40 31 46C27 33 23 24 15 20Z"
        fill="#B91C1C"
      />
      <path
        d="M49 20C50 31 45 40 33 46C37 33 41 24 49 20Z"
        fill="#B91C1C"
      />
      {/* Side golden petals */}
      <path
        d="M8 34C13 43 21 48 31 48C25 40 17 34 8 34Z"
        fill="#D97706"
      />
      <path
        d="M56 34C51 43 43 48 33 48C39 40 47 34 56 34Z"
        fill="#D97706"
      />
      {/* Bright royal gold core */}
      <path
        d="M32 23C27 30 27 39 32 47C37 39 37 30 32 23Z"
        fill="#FCD34D"
      />
      <ellipse cx="32" cy="51" rx="16" ry="3.2" fill="#F5B324" opacity="0.55" />
    </svg>
  );
}

export default function App() {
  const wheelRef = useRef<MudraWheelHandle | null>(null);
  const isSpinningRef = useRef(false);
  const entryCounterRef = useRef(0);
  const sequenceRef = useRef<SequenceEntry[]>([]);
  const autoRespinTimerRef = useRef<number | null>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [sequence, setSequence] = useState<SequenceEntry[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<DuplicateNotice | null>(null);
  const [isSequenceHidden, setIsSequenceHidden] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [showFinaleBanner, setShowFinaleBanner] = useState(true);
  const [mudraSprites, setMudraSprites] = useState<Record<number, MudraSpriteAsset>>({});

  useEffect(() => {
    let active = true;
    void loadMudraSprites().then((loaded) => {
      if (active) setMudraSprites(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoRespinTimerRef.current !== null) {
        window.clearTimeout(autoRespinTimerRef.current);
      }
    };
  }, []);

  const currentLevel = LEVELS[levelIndex];
  const targetCount = currentLevel.targetCount;
  const maxFinaleCount = LEVELS[LEVELS.length - 1].targetCount; // 7
  const hasReachedLevelTarget = sequence.length >= targetCount;
  const isFinaleCompleted = currentLevel.isFinale && sequence.length >= maxFinaleCount;
  const isAutoRespinPending = duplicateNotice !== null;
  const isWheelBusy = isSpinning || isAutoRespinPending;
  const canAdvanceLevel = hasReachedLevelTarget && !currentLevel.isFinale && !isWheelBusy;
  const canSpin = !isWheelBusy && !hasReachedLevelTarget;
  const latestEntry = sequence.length > 0 ? sequence[sequence.length - 1] : null;

  const levelProgressPercent = Math.min(100, Math.round((sequence.length / targetCount) * 100));

  // Sync fullscreen state with browser events
  useEffect(() => {
    const onFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Escape closes confirmation modal
  useEffect(() => {
    if (!isResetModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsResetModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isResetModalOpen]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      mudraAudio.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const rootEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        setIsExpandedView(false);
      } else if (rootEl.requestFullscreen) {
        await rootEl.requestFullscreen();
      } else if (rootEl.webkitRequestFullscreen) {
        await rootEl.webkitRequestFullscreen();
      } else {
        setIsExpandedView((prev) => !prev);
      }
    } catch {
      // Fallback for sandboxed iframes where browser fullscreen API is restricted
      setIsExpandedView((prev) => !prev);
    }
  }, []);

  const launchWheelSpin = useCallback(() => {
    const selectedIndex = getUniformRandomInt(SECTOR_COUNT);
    const durationMs = getUniformRandomFloat(4400, 5600);

    isSpinningRef.current = true;
    setIsSpinning(true);
    wheelRef.current?.spinTo(selectedIndex, durationMs);
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinningRef.current || hasReachedLevelTarget || duplicateNotice !== null) return;
    launchWheelSpin();
  }, [hasReachedLevelTarget, duplicateNotice, launchWheelSpin]);

  const handleSpinComplete = useCallback(
    (verifiedSectorIndex: number) => {
      const drawnMudra = MUDRAS[verifiedSectorIndex];
      isSpinningRef.current = false;
      setIsSpinning(false);

      const currentSeq = sequenceRef.current;
      const previousEntry = currentSeq.length > 0 ? currentSeq[currentSeq.length - 1] : null;

      // If the exact same Mudra lands twice in a row, display a message and auto-respin
      if (previousEntry && previousEntry.mudra.id === drawnMudra.id) {
        mudraAudio.playDuplicateRespin();
        setDuplicateNotice({ mudra: drawnMudra, phase: 'countdown' });

        if (autoRespinTimerRef.current !== null) {
          window.clearTimeout(autoRespinTimerRef.current);
        }
        autoRespinTimerRef.current = window.setTimeout(() => {
          autoRespinTimerRef.current = null;
          setDuplicateNotice({ mudra: drawnMudra, phase: 'respinning' });
          launchWheelSpin();
        }, 1800);
        return;
      }

      setDuplicateNotice(null);
      entryCounterRef.current += 1;
      const newEntry: SequenceEntry = {
        uid: `mudra-${entryCounterRef.current}-${drawnMudra.id}`,
        mudra: drawnMudra,
      };

      const next = [...currentSeq, newEntry];
      sequenceRef.current = next;
      setSequence(next);

      if (currentLevel.isFinale && next.length >= maxFinaleCount) {
        setShowFinaleBanner(true);
        mudraAudio.playFinaleCelebration();
      } else {
        mudraAudio.playMudraLand();
      }
    },
    [currentLevel.isFinale, maxFinaleCount, launchWheelSpin],
  );

  const handleAdvanceLevel = useCallback(() => {
    if (!canAdvanceLevel) return;
    setLevelIndex((prev) => Math.min(LEVELS.length - 1, prev + 1));
    mudraAudio.playLevelAdvance();
  }, [canAdvanceLevel]);

  const handleUndoLast = useCallback(() => {
    if (isSpinningRef.current || duplicateNotice !== null || sequenceRef.current.length === 0) return;
    const next = sequenceRef.current.slice(0, -1);
    sequenceRef.current = next;
    setSequence(next);
  }, [duplicateNotice]);

  const handleConfirmReset = useCallback(() => {
    if (isSpinningRef.current) return;
    if (autoRespinTimerRef.current !== null) {
      window.clearTimeout(autoRespinTimerRef.current);
      autoRespinTimerRef.current = null;
    }
    sequenceRef.current = [];
    setSequence([]);
    setDuplicateNotice(null);
    setLevelIndex(0);
    setIsSequenceHidden(false);
    setShowFinaleBanner(true);
    setIsResetModalOpen(false);
  }, []);

  const isFullscreenActive = isFullscreen || isExpandedView;

  return (
    <div
      className={`min-h-screen w-full text-[#FFF8EA] flex flex-col overflow-x-hidden ${
        isExpandedView ? 'fixed inset-0 z-30 overflow-y-auto' : ''
      }`}
      style={{
        background:
          'radial-gradient(circle at 28% 36%, rgba(245, 179, 36, 0.22) 0%, rgba(168, 20, 28, 0.88) 38%, rgba(86, 8, 14, 0.98) 76%, #360408 100%)',
      }}
    >
      {/* Celebratory red & gold lotus petals animation for Finale victory */}
      <CelebrationOverlay active={isFinaleCompleted && showFinaleBanner} />

      {/* Top Bar */}
      <header className="w-full border-b border-[#F5B324]/35 bg-[#3B050A]/90 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <LotusEmblem className="h-9 w-9 shrink-0" />
            <h1 className="truncate text-xl font-extrabold tracking-tight text-[#FFF8EA] sm:text-2xl">
              Le défi des Mudras
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              title={isMuted ? 'Activer le son' : 'Couper le son'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3 text-sm font-semibold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-[#F3D9A4]/60" />
              ) : (
                <Volume2 className="h-5 w-5 text-[#FCD34D]" />
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3.5 py-2 text-sm font-bold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              {isFullscreenActive ? '⛶ Quitter le plein écran' : '⛶ Plein écran'}
            </button>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              disabled={isWheelBusy}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#F5B324]/55 bg-[#7F1119] px-3.5 py-2 text-sm font-bold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#9E1620] hover:border-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">🔄 Nouvelle partie</span>
              <span className="sm:hidden">🔄 Rejouer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col gap-6 px-4 py-5 sm:px-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 lg:px-8 lg:py-7">
        {/* LEFT / CENTER HERO STAGE: The Grand 3D Wheel & Primary Action */}
        <section
          aria-label="Roue des Mudras"
          className="flex flex-col items-center justify-center lg:col-span-7"
        >
          {/* Warm royal gold aura behind the 3D wheel */}
          <div className="relative flex w-full flex-col items-center">
            <div
              className="pointer-events-none absolute inset-0 m-auto h-[88%] w-[88%] max-w-[560px] rounded-full opacity-80"
              style={{
                background:
                  'radial-gradient(circle, rgba(252,211,77,0.34) 0%, rgba(245,179,36,0.16) 44%, rgba(139,17,26,0) 74%)',
              }}
              aria-hidden="true"
            />

            <MudraWheel3D
              ref={wheelRef}
              canSpin={canSpin}
              isSpinning={isSpinning}
              onWheelClick={handleSpin}
              onSpinComplete={handleSpinComplete}
              highlightFinale={isFinaleCompleted}
              mudraSprites={mudraSprites}
            />
          </div>

          {/* Consecutive Duplicate Mudra Alert Banner */}
          {duplicateNotice && (
            <div
              role="status"
              aria-live="assertive"
              className="animate-lotus-reveal mt-3 flex w-full max-w-[540px] items-center justify-center gap-3 rounded-2xl border-2 border-[#FCD34D] bg-[#2D0408]/95 px-5 py-3.5 text-center shadow-lg shadow-black/40"
            >
              <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-[#FCD34D]" aria-hidden="true" />
              <div className="text-left sm:text-center">
                <p className="text-sm sm:text-base font-extrabold text-[#FDE68A]">
                  Même mudra deux fois de suite : {duplicateNotice.mudra.name.toUpperCase()} !
                </p>
                <p className="text-xs sm:text-sm font-semibold text-[#FFF8EA]/90">
                  {duplicateNotice.phase === 'countdown'
                    ? 'La roue se relance toute seule dans un instant…'
                    : 'Relance automatique en cours…'}
                </p>
              </div>
            </div>
          )}

          {/* Primary Red Action CTA & Level Advance CTA directly beneath the wheel */}
          <div className="mt-4 flex w-full max-w-[540px] flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleSpin}
              disabled={!canSpin}
              className={`w-full min-h-[60px] rounded-2xl px-7 py-3.5 text-lg font-extrabold uppercase tracking-wider shadow-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/50 whitespace-nowrap ${
                canSpin
                  ? 'border-2 border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer shadow-black/35'
                  : 'border border-[#F5B324]/25 bg-[#4A090F]/70 text-[#F3D9A4]/50 cursor-not-allowed shadow-none'
              }`}
            >
              {duplicateNotice
                ? '🔄 RELANCE AUTOMATIQUE…'
                : isSpinning
                  ? '🎡 LA ROUE TOURNE…'
                  : isFinaleCompleted
                    ? '🏆 FINALE TERMINÉE (7 MUDRAS)'
                    : hasReachedLevelTarget
                      ? `✓ ${currentLevel.label.toUpperCase()} ATTEINT (${targetCount} MUDRAS)`
                      : '🎡 TOURNER LA ROUE'}
            </button>

            {canAdvanceLevel && (
              <button
                type="button"
                onClick={handleAdvanceLevel}
                className="animate-lotus-reveal w-full min-h-[58px] rounded-2xl border-2 border-[#FDE68A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-3.5 text-base sm:text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/35 transition-all duration-150 hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/55"
              >
                NIVEAU RÉUSSI : AJOUTER UN MUDRA
              </button>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Progression, Latest Result & Memorization Sequence */}
        <section
          aria-label="Progression et séquence à mémoriser"
          className="flex flex-col gap-5 lg:col-span-5"
        >
          {/* Finale Victory Banner */}
          {isFinaleCompleted && (
            <div
              role="status"
              aria-live="polite"
              className="animate-lotus-reveal rounded-2xl border-2 border-[#FCD34D] bg-[#3B050A]/92 p-5 text-center shadow-lg shadow-black/35"
            >
              <p className="text-2xl sm:text-[1.65rem] font-extrabold tracking-tight text-[#FDE68A]">
                🎉 Bravo, Maître des Mudras ! 🪷
              </p>
              <p className="mt-1.5 text-sm sm:text-base text-[#FFF8EA]/85">
                Vous avez réussi les 6 étapes et réuni les 7 mudras de la Finale.
                Cachez la séquence pour faire la démonstration finale de mémoire !
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="min-h-[44px] rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  🔄 NOUVELLE PARTIE
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinaleBanner((prev) => !prev)}
                  className="min-h-[44px] rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer"
                >
                  {showFinaleBanner ? 'Mettre les pétales en pause' : 'Relancer la fête'}
                </button>
              </div>
            </div>
          )}

          {/* 1. Level & Progress Panel */}
          <div className="rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-5 shadow-md shadow-black/25 backdrop-blur-xs">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#F3D9A4]/80">
                  Progression du défi
                </p>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-extrabold text-[#FFF8EA]">
                  {currentLevel.label}
                </h2>
              </div>
              <div className="text-right tabular-nums">
                <span className="text-2xl font-extrabold text-[#FCD34D]">
                  {sequence.length}
                </span>
                <span className="text-base font-bold text-[#F3D9A4]/75">
                  {' '}
                  / {targetCount} mudras
                </span>
              </div>
            </div>

            {/* Smooth Red & Gold Progress Bar */}
            <div
              className="mt-3.5 h-3.5 w-full overflow-hidden rounded-full border border-[#F5B324]/25 bg-[#240306]"
              role="progressbar"
              aria-valuenow={sequence.length}
              aria-valuemin={0}
              aria-valuemax={targetCount}
              aria-label={`Progression du ${currentLevel.label} : ${sequence.length} sur ${targetCount} mudras`}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${levelProgressPercent}%`,
                  background: isFinaleCompleted
                    ? 'linear-gradient(90deg, #DC2626 0%, #F5B324 52%, #FEF08A 100%)'
                    : hasReachedLevelTarget
                      ? 'linear-gradient(90deg, #D97706 0%, #FCD34D 100%)'
                      : 'linear-gradient(90deg, #DC2626 0%, #F59E0B 65%, #FDE68A 100%)',
                }}
              />
            </div>

            {/* 6-step milestone track */}
            <div className="mt-3.5 grid grid-cols-6 gap-1.5 text-center">
              {LEVELS.map((lvl) => {
                const isDone =
                  lvl.index < levelIndex ||
                  (lvl.index === levelIndex && sequence.length >= lvl.targetCount);
                const isCurrent = lvl.index === levelIndex;

                return (
                  <div
                    key={lvl.index}
                    className={`rounded-lg border px-1 py-1.5 transition-colors ${
                      isCurrent
                        ? 'border-[#FCD34D]/80 bg-[#B91C1C]/50 text-[#FEF3C7]'
                        : isDone
                          ? 'border-[#F5B324]/45 bg-[#F5B324]/18 text-[#FCD34D]'
                          : 'border-[#F5B324]/15 bg-[#260306]/70 text-[#F3D9A4]/50'
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-tight truncate">
                      {lvl.shortLabel}
                    </div>
                    <div className="mt-0.5 text-xs font-extrabold tabular-nums">
                      {lvl.targetCount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Latest Drawn Mudra Spotlight */}
          <div
            aria-live="polite"
            className="rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-5 shadow-md shadow-black/25 backdrop-blur-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#F3D9A4]/85">
                Dernier mudra obtenu
              </h2>
              {latestEntry && !isSequenceHidden && (
                <span className="text-xs font-semibold text-[#FCD34D]/85 tabular-nums">
                  Tirage n°{sequence.length}
                </span>
              )}
            </div>

            <div className="mt-3 flex min-h-[84px] items-center justify-center rounded-xl border border-[#F5B324]/25 bg-[#240306]/80 px-4 py-3 text-center">
              {duplicateNotice ? (
                <div className="animate-lotus-reveal flex flex-col items-center gap-1">
                  <span className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-[#FCD34D]">
                    DOUBLON : {duplicateNotice.mudra.name.toUpperCase()}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#FFF8EA]/85">
                    {duplicateNotice.phase === 'countdown'
                      ? 'Deux fois de suite ! La roue se relance toute seule…'
                      : 'Nouveau tirage automatique en cours…'}
                  </span>
                </div>
              ) : isSpinning ? (
                <p className="text-lg font-bold text-[#FCD34D]">
                  Tirage en cours…
                </p>
              ) : !latestEntry ? (
                <p className="text-sm sm:text-base font-medium text-[#F3D9A4]/75">
                  Appuyez sur « TOURNER LA ROUE » pour découvrir le premier mudra.
                </p>
              ) : isSequenceHidden ? (
                <div className="flex flex-col items-center">
                  <span
                    className="text-4xl font-extrabold tracking-widest text-[#FCD34D]/75"
                    aria-label="Résultat masqué"
                  >
                    ?
                  </span>
                  <span className="mt-1 text-xs font-medium text-[#F3D9A4]/75">
                    Séquence cachée — à vous de reproduire de mémoire
                  </span>
                </div>
              ) : (
                <div
                  key={latestEntry.uid}
                  className="animate-lotus-reveal flex items-center justify-center gap-4"
                >
                  {mudraSprites[latestEntry.mudra.id] ? (
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 bg-[#FFF8EA] p-1.5 shadow-sm"
                      style={{ borderColor: '#F5B324' }}
                    >
                      <img
                        src={mudraSprites[latestEntry.mudra.id].dataUrl}
                        alt={`Geste du mudra ${latestEntry.mudra.name.toUpperCase()}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-[#FDE68A]/50"
                      style={{ backgroundColor: latestEntry.mudra.colorHex }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="text-left">
                    <span className="block text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-[#FFF8EA]">
                      {latestEntry.mudra.name.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Memorization Sequence List & Game Controls */}
          <div className="flex flex-col rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-5 shadow-md shadow-black/25 backdrop-blur-xs">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[#FFF8EA]">
                Votre séquence
              </h2>
              <span className="text-xs font-semibold text-[#F3D9A4]/80 tabular-nums">
                {sequence.length === 0
                  ? 'Aucun mudra tiré'
                  : `${sequence.length} ${sequence.length > 1 ? 'étapes' : 'étape'}`}
              </span>
            </div>

            {/* Ordered Sequence List */}
            {sequence.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#F5B324]/30 bg-[#240306]/60 px-4 py-6 text-center text-sm text-[#F3D9A4]/75">
                Les mudras tirés apparaîtront ici dans l’ordre, numérotés de 1 à{' '}
                {targetCount}.
              </div>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {sequence.map((entry, idx) => {
                  const isNewest = idx === sequence.length - 1;
                  return (
                    <li
                      key={entry.uid}
                      className={`animate-lotus-reveal flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                        isNewest && !isSequenceHidden
                          ? 'border-[#FCD34D]/75 bg-[#5E0A12]/90'
                          : 'border-[#F5B324]/25 bg-[#240306]/75'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FCD34D]/55 bg-[#991B1B] text-sm font-extrabold text-[#FFF8EA] tabular-nums">
                          {idx + 1}
                        </span>
                        {!isSequenceHidden && mudraSprites[entry.mudra.id] && (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F5B324]/80 bg-[#FFF8EA] p-1">
                            <img
                              src={mudraSprites[entry.mudra.id].dataUrl}
                              alt={`Geste ${entry.mudra.name.toUpperCase()}`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        <span
                          className={`truncate text-base sm:text-lg font-extrabold uppercase tracking-wide ${
                            isSequenceHidden
                              ? 'tracking-widest text-[#FCD34D]/60'
                              : 'text-[#FFF8EA]'
                          }`}
                        >
                          {isSequenceHidden ? '?' : entry.mudra.name.toUpperCase()}
                        </span>
                      </div>

                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#FDE68A]/50"
                        style={{
                          backgroundColor: isSequenceHidden
                            ? 'rgba(245, 179, 36, 0.22)'
                            : entry.mudra.colorHex,
                        }}
                        aria-hidden="true"
                      />
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Memorization & Undo Controls */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsSequenceHidden((prev) => !prev)}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap ${
                  isSequenceHidden
                    ? 'border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
                    : 'border-[#F5B324]/50 bg-[#7F1119] text-[#FFF8EA] hover:bg-[#9E1620] hover:border-[#FCD34D]'
                }`}
              >
                {isSequenceHidden
                  ? '👀 Afficher la séquence'
                  : '🙈 Cacher la séquence'}
              </button>

              <button
                type="button"
                onClick={handleUndoLast}
                disabled={sequence.length === 0 || isWheelBusy}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                ↩️ Annuler le dernier tirage
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* New Game Confirmation Modal (never uses window.confirm) */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0204]/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div
            className="animate-lotus-reveal w-full max-w-md rounded-2xl border-2 border-[#F5B324]/60 bg-[#3B050A] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <LotusEmblem className="h-8 w-8 shrink-0" />
              <h2
                id="reset-modal-title"
                className="text-xl font-extrabold text-[#FFF8EA]"
              >
                Recommencer une nouvelle partie ?
              </h2>
            </div>

            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#F3D9A4]/85">
              La séquence actuelle, le niveau ({currentLevel.label}) et votre
              progression seront entièrement réinitialisés au Niveau 1.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="min-h-[46px] rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-5 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="min-h-[46px] rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                🔄 OUI, NOUVELLE PARTIE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
