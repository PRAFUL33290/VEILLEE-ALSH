import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Eye,
  EyeOff,
  Hand,
  Home,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Timer,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
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
import {
  LevelSuccessAnnouncement,
  LevelSuccessToast,
} from './components/LevelSuccessToast';
import { CountdownBanner, TimerStatus } from './components/CountdownBanner';
import {
  DuelFamilySlot,
  FamilyDuelBar,
  LevelAttemptStatus,
  TortueRewardModal,
  TortueRewardPreview,
  countEvaluatedLevels,
  createEmptyLevelResults,
  deriveTeamOutcomeFromLevels,
  getDisplayFamilyName,
} from './components/FamilyDuelBar';
import { HomeScreen } from './components/HomeScreen';
import {
  SESSION_PLAY_SECONDS,
  SESSION_TOTAL_SECONDS,
  SessionTimerHeader,
  SessionTimerStatus,
} from './components/SessionTimerHeader';
import { InlineMusicPlayer } from './components/YouTubeMusicDock';

const DEFAULT_LEVEL_TIMER_SECONDS = 30; // 30 secondes d'entraînement pour les deux équipes
const DUEL_LIMIT_SECONDS = 8 * 60; // 8 minutes total per duel

function createDefaultDuelFamilies(): [DuelFamilySlot, DuelFamilySlot] {
  return [
    {
      id: 0,
      name: 'TEAM 1',
      outcome: 'pending',
      levelResults: createEmptyLevelResults(),
      mudrasReached: null,
      elapsedSec: null,
    },
    {
      id: 1,
      name: 'TEAM 2',
      outcome: 'pending',
      levelResults: createEmptyLevelResults(),
      mudrasReached: null,
      elapsedSec: null,
    },
  ];
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
  const timerDeadlineRef = useRef<number>(0);
  const lastTimerTickSecRef = useRef<number>(0);

  const [levelIndex, setLevelIndex] = useState(0);
  const [sequence, setSequence] = useState<SequenceEntry[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSequenceHidden, setIsSequenceHidden] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(1);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [showFinaleBanner, setShowFinaleBanner] = useState(true);
  const [isFinaleValidated, setIsFinaleValidated] = useState(false);
  const [mudraSprites, setMudraSprites] = useState<Record<number, MudraSpriteAsset>>({});
  const [zoomedMudraIndex, setZoomedMudraIndex] = useState<number | null>(null);
  const [isSequenceFullscreenOpen, setIsSequenceFullscreenOpen] = useState(false);
  const [isWheelFullscreen, setIsWheelFullscreen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'game'>('home');
  const [isGameStagePrewarmed, setIsGameStagePrewarmed] = useState(false);

  // Per-level 1-minute Chrono + total duel elapsed tracker (toward 8 min limit)
  const [isLevelTimerEnabled, setIsLevelTimerEnabled] = useState(true);
  const [levelTimerSec, setLevelTimerSec] = useState(DEFAULT_LEVEL_TIMER_SECONDS);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_LEVEL_TIMER_SECONDS * 1000);
  const [duelStartedAtMs, setDuelStartedAtMs] = useState<number | null>(null);
  const [duelElapsedSec, setDuelElapsedSec] = useState<number>(0);

  // Global 8-Minute Session Timer (2 min Règles + 6 min Jeu) shared in header across Home & Game
  const sessionDeadlineRef = useRef<number>(0);
  const sessionLastTickSecRef = useRef<number>(0);
  const sessionRulesChimePlayedRef = useRef<boolean>(false);
  const [sessionTimerStatus, setSessionTimerStatus] = useState<SessionTimerStatus>('idle');
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number>(
    SESSION_TOTAL_SECONDS * 1000,
  );

  // Team 1 vs Team 2 duel state
  const [families, setFamilies] =
    useState<[DuelFamilySlot, DuelFamilySlot]>(createDefaultDuelFamilies);
  const [rewardPreview, setRewardPreview] = useState<TortueRewardPreview | null>(null);

  const familiesRef = useRef(families);
  familiesRef.current = families;
  const levelTimerSecRef = useRef(levelTimerSec);
  levelTimerSecRef.current = levelTimerSec;
  const duelElapsedSecRef = useRef(duelElapsedSec);
  duelElapsedSecRef.current = duelElapsedSec;
  const [levelSuccessAnnouncement, setLevelSuccessAnnouncement] =
    useState<LevelSuccessAnnouncement | null>(null);
  const [fullscreenRevealCard, setFullscreenRevealCard] = useState<{
    id: number;
    stepNumber: number;
    mudra: MudraSector;
    isLeaving: boolean;
  } | null>(null);
  const levelSuccessTimerRef = useRef<number | null>(null);
  const levelSuccessIdRef = useRef(0);
  const isWheelFullscreenRef = useRef(isWheelFullscreen);
  isWheelFullscreenRef.current = isWheelFullscreen;
  const fullscreenRevealLeaveTimerRef = useRef<number | null>(null);
  const fullscreenRevealHideTimerRef = useRef<number | null>(null);
  const fullscreenRevealIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    void loadMudraSprites().then((loaded) => {
      if (active) setMudraSprites(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Pre-warm the 3D Wheel WebGL context silently after the HomeScreen first paint
  // so clicking "Commencer la partie" is instantaneous (<16ms, zero shader stutter)
  useEffect(() => {
    if (isGameStagePrewarmed) return;
    const timerId = window.setTimeout(() => {
      setIsGameStagePrewarmed(true);
    }, 120);
    return () => window.clearTimeout(timerId);
  }, [isGameStagePrewarmed]);

  useEffect(() => {
    return () => {
      if (levelSuccessTimerRef.current !== null) {
        window.clearTimeout(levelSuccessTimerRef.current);
      }
      if (fullscreenRevealLeaveTimerRef.current !== null) {
        window.clearTimeout(fullscreenRevealLeaveTimerRef.current);
      }
      if (fullscreenRevealHideTimerRef.current !== null) {
        window.clearTimeout(fullscreenRevealHideTimerRef.current);
      }
      mudraAudio.setMusicPlaying(false);
    };
  }, []);

  const currentLevel = LEVELS[levelIndex];
  const targetCount = currentLevel.targetCount;
  const maxFinaleCount = LEVELS[LEVELS.length - 1].targetCount; // 11
  const nextLevelDelta =
    !currentLevel.isFinale && LEVELS[levelIndex + 1]
      ? Math.max(1, LEVELS[levelIndex + 1].targetCount - currentLevel.targetCount)
      : 1;
  const hasReachedLevelTarget = sequence.length >= targetCount;
  const hasDrawnFinaleMudras = currentLevel.isFinale && sequence.length >= maxFinaleCount;
  const isFinaleCompleted = hasDrawnFinaleMudras && isFinaleValidated;
  const isWheelBusy = isSpinning;
  const canAdvanceLevel = hasReachedLevelTarget && !currentLevel.isFinale && !isWheelBusy;
  const canValidateFinale = hasDrawnFinaleMudras && !isFinaleValidated && !isWheelBusy;
  const canSpin = !isWheelBusy && !hasReachedLevelTarget;
  const canResetCurrentRun =
    sequence.length > 0 ||
    levelIndex > 0 ||
    countEvaluatedLevels(families[0].levelResults) > 0 ||
    countEvaluatedLevels(families[1].levelResults) > 0 ||
    families[0].outcome !== 'pending' ||
    families[1].outcome !== 'pending';
  const familyADisplayName = getDisplayFamilyName(families[0].name, 0);
  const familyBDisplayName = getDisplayFamilyName(families[1].name, 1);

  const levelProgressPercent = Math.min(100, Math.round((sequence.length / targetCount) * 100));

  // Keep fullscreen Mudra & sequence viewers in sync if sequence shrinks or gets hidden
  useEffect(() => {
    if (sequence.length === 0 && isSequenceFullscreenOpen) {
      setIsSequenceFullscreenOpen(false);
    }
    if (zoomedMudraIndex === null) return;
    if (isSequenceHidden || zoomedMudraIndex >= sequence.length) {
      setZoomedMudraIndex(null);
    }
  }, [isSequenceHidden, sequence.length, zoomedMudraIndex, isSequenceFullscreenOpen]);

  // Keyboard navigation & scroll lock for fullscreen Mudra / sequence / wheel viewers
  useEffect(() => {
    if (zoomedMudraIndex === null && !isSequenceFullscreenOpen && !isWheelFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (zoomedMudraIndex !== null) {
          setZoomedMudraIndex(null);
        } else if (isSequenceFullscreenOpen) {
          setIsSequenceFullscreenOpen(false);
        } else if (isWheelFullscreen) {
          setIsWheelFullscreen(false);
        }
      } else if (zoomedMudraIndex !== null && event.key === 'ArrowLeft' && sequence.length > 1) {
        event.preventDefault();
        setZoomedMudraIndex((prev) =>
          prev === null ? null : (prev - 1 + sequence.length) % sequence.length,
        );
      } else if (zoomedMudraIndex !== null && event.key === 'ArrowRight' && sequence.length > 1) {
        event.preventDefault();
        setZoomedMudraIndex((prev) =>
          prev === null ? null : (prev + 1) % sequence.length,
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [zoomedMudraIndex, isSequenceFullscreenOpen, isWheelFullscreen, sequence.length]);

  // Track total duel elapsed seconds smoothly once the duel starts
  useEffect(() => {
    if (duelStartedAtMs === null) return;
    const updateElapsed = () => {
      setDuelElapsedSec(Math.floor((Date.now() - duelStartedAtMs) / 1000));
    };
    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [duelStartedAtMs]);

  // Drift-free 60fps countdown loop for the 30-second family practice timer
  useEffect(() => {
    if (!isLevelTimerEnabled || timerStatus !== 'running') return;

    let rafId = 0;
    const step = () => {
      const nextMs = Math.max(0, timerDeadlineRef.current - performance.now());
      setRemainingMs(nextMs);

      if (nextMs > 0 && nextMs <= 5000) {
        const secCeil = Math.ceil(nextMs / 1000);
        if (secCeil !== lastTimerTickSecRef.current) {
          lastTimerTickSecRef.current = secCeil;
          mudraAudio.playTimerTick(secCeil <= 3);
        }
      }

      if (nextMs <= 0) {
        setTimerStatus('expired');
        mudraAudio.playTimerExpired();
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isLevelTimerEnabled, timerStatus]);

  // Drift-free countdown loop for the shared 8-minute header session timer (2 min règles + 6 min jeu)
  useEffect(() => {
    if (sessionTimerStatus !== 'running') return;

    const playPhaseThresholdMs = SESSION_PLAY_SECONDS * 1000;
    let intervalId = 0;

    const tick = () => {
      const nextMs = Math.max(0, sessionDeadlineRef.current - performance.now());
      setSessionRemainingMs(nextMs);

      // Gentle transition chime when 2 min Règles ends and 6 min Jeu starts
      if (nextMs <= playPhaseThresholdMs && !sessionRulesChimePlayedRef.current) {
        sessionRulesChimePlayedRef.current = true;
        mudraAudio.playLevelAdvance();
      }

      if (nextMs > 0 && nextMs <= 10_000) {
        const secCeil = Math.ceil(nextMs / 1000);
        if (secCeil !== sessionLastTickSecRef.current) {
          sessionLastTickSecRef.current = secCeil;
          mudraAudio.playTimerTick(secCeil <= 3);
        }
      }

      if (nextMs <= 0) {
        setSessionTimerStatus('expired');
        mudraAudio.playTimerExpired();
        window.clearInterval(intervalId);
      }
    };

    tick();
    intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  }, [sessionTimerStatus]);

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
    mudraAudio.unlock();
    setIsMuted((prev) => {
      const next = !prev;
      mudraAudio.setMuted(next);
      if (!next) {
        setSfxVolume(mudraAudio.getSfxVolume());
        mudraAudio.playUnmuteChime();
      }
      return next;
    });
  }, []);

  const handleChangeSfxVolume = useCallback((nextPercent: number) => {
    mudraAudio.unlock();
    const normalized = Math.min(1, Math.max(0, nextPercent / 100));
    setSfxVolume(normalized);
    setIsMuted(normalized <= 0.001);
    mudraAudio.setSfxVolume(normalized);
  }, []);

  const handlePreviewSfxVolume = useCallback(() => {
    if (!mudraAudio.isMuted() && mudraAudio.getSfxVolume() > 0.001) {
      mudraAudio.playTick(0.65);
    }
  }, []);

  const handleSetFallbackSynth = useCallback((playing: boolean) => {
    if (playing) {
      mudraAudio.unlock();
    }
    setIsMusicPlaying(playing);
    mudraAudio.setMusicPlaying(playing);
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

  const handleEnterWheelFullscreen = useCallback(async () => {
    setIsWheelFullscreen(true);
    const rootEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };
    try {
      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        if (rootEl.requestFullscreen) {
          await rootEl.requestFullscreen();
        } else if (rootEl.webkitRequestFullscreen) {
          await rootEl.webkitRequestFullscreen();
        }
      }
    } catch {
      // iPadOS Safari / sandboxed iframe fallback: fixed full-viewport wheel stage is already active
    }
  }, []);

  const handleExitWheelFullscreen = useCallback(async () => {
    if (fullscreenRevealLeaveTimerRef.current !== null) {
      window.clearTimeout(fullscreenRevealLeaveTimerRef.current);
      fullscreenRevealLeaveTimerRef.current = null;
    }
    if (fullscreenRevealHideTimerRef.current !== null) {
      window.clearTimeout(fullscreenRevealHideTimerRef.current);
      fullscreenRevealHideTimerRef.current = null;
    }
    setFullscreenRevealCard(null);
    setIsWheelFullscreen(false);

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore exit errors
    }
  }, []);

  const ensureDuelClockStarted = useCallback(() => {
    setDuelStartedAtMs((prev) => (prev === null ? Date.now() : prev));
  }, []);

  const startOrResumeTimer = useCallback(
    (forceFresh = false) => {
      mudraAudio.unlock();
      ensureDuelClockStarted();
      const baseMs =
        forceFresh || timerStatus === 'expired' || remainingMs <= 0
          ? levelTimerSec * 1000
          : remainingMs;
      timerDeadlineRef.current = performance.now() + baseMs;
      lastTimerTickSecRef.current = 0;
      setRemainingMs(baseMs);
      setTimerStatus('running');
    },
    [ensureDuelClockStarted, levelTimerSec, remainingMs, timerStatus],
  );

  const handlePauseTimer = useCallback(() => {
    if (timerStatus !== 'running') return;
    const left = Math.max(0, timerDeadlineRef.current - performance.now());
    setRemainingMs(left);
    setTimerStatus('paused');
  }, [timerStatus]);

  const handleResetTimer = useCallback(() => {
    lastTimerTickSecRef.current = 0;
    setRemainingMs(levelTimerSec * 1000);
    setTimerStatus('idle');
  }, [levelTimerSec]);

  const handleToggleSessionTimer = useCallback(() => {
    mudraAudio.unlock();
    if (sessionTimerStatus === 'running') {
      const left = Math.max(0, sessionDeadlineRef.current - performance.now());
      setSessionRemainingMs(left);
      setSessionTimerStatus(left <= 0 ? 'expired' : 'paused');
      return;
    }

    const totalMs = SESSION_TOTAL_SECONDS * 1000;
    const baseMs =
      sessionTimerStatus === 'expired' || sessionRemainingMs <= 0
        ? totalMs
        : sessionRemainingMs;

    if (baseMs > SESSION_PLAY_SECONDS * 1000) {
      sessionRulesChimePlayedRef.current = false;
    }
    sessionLastTickSecRef.current = 0;
    sessionDeadlineRef.current = performance.now() + baseMs;
    setSessionRemainingMs(baseMs);
    setSessionTimerStatus('running');
  }, [sessionRemainingMs, sessionTimerStatus]);

  const handleResetSessionTimer = useCallback(() => {
    sessionLastTickSecRef.current = 0;
    sessionRulesChimePlayedRef.current = false;
    setSessionTimerStatus('idle');
    setSessionRemainingMs(SESSION_TOTAL_SECONDS * 1000);
  }, []);

  const handleToggleLevelTimer = useCallback(() => {
    mudraAudio.unlock();
    setIsLevelTimerEnabled((prev) => !prev);
    lastTimerTickSecRef.current = 0;
    setRemainingMs(levelTimerSec * 1000);
    setTimerStatus('idle');
  }, [levelTimerSec]);

  const handleAdjustLevelSeconds = useCallback((deltaSec: number) => {
    setLevelTimerSec((prevSec) => {
      const nextSec = Math.min(300, Math.max(15, prevSec + deltaSec));
      lastTimerTickSecRef.current = 0;
      setRemainingMs(nextSec * 1000);
      setTimerStatus('idle');
      return nextSec;
    });
  }, []);

  const launchWheelSpin = useCallback(() => {
    const selectedIndex = getUniformRandomInt(SECTOR_COUNT);
    const durationMs = getUniformRandomFloat(4400, 5600);

    isSpinningRef.current = true;
    setIsSpinning(true);
    wheelRef.current?.spinTo(selectedIndex, durationMs);
  }, []);

  const dismissFullscreenRevealCard = useCallback(() => {
    if (fullscreenRevealLeaveTimerRef.current !== null) {
      window.clearTimeout(fullscreenRevealLeaveTimerRef.current);
      fullscreenRevealLeaveTimerRef.current = null;
    }
    if (fullscreenRevealHideTimerRef.current !== null) {
      window.clearTimeout(fullscreenRevealHideTimerRef.current);
      fullscreenRevealHideTimerRef.current = null;
    }
    setFullscreenRevealCard(null);
  }, []);

  const handleSpin = useCallback(() => {
    mudraAudio.unlock();
    if (isSpinningRef.current || hasReachedLevelTarget) return;
    dismissFullscreenRevealCard();
    ensureDuelClockStarted();
    launchWheelSpin();
  }, [hasReachedLevelTarget, dismissFullscreenRevealCard, ensureDuelClockStarted, launchWheelSpin]);

  const handleManualSpinStart = useCallback(() => {
    dismissFullscreenRevealCard();
    isSpinningRef.current = true;
    setIsSpinning(true);
    ensureDuelClockStarted();
  }, [dismissFullscreenRevealCard, ensureDuelClockStarted]);

  const handleSpinInterrupt = useCallback(() => {
    mudraAudio.stopSpinFairy();
    isSpinningRef.current = false;
    setIsSpinning(false);
  }, []);

  const handleSpinComplete = useCallback(
    (verifiedSectorIndex: number) => {
      const drawnMudra = MUDRAS[verifiedSectorIndex];
      isSpinningRef.current = false;
      setIsSpinning(false);

      // Every landed mudra counts immediately (including duplicates — never auto-respin)
      const currentSeq = sequenceRef.current;
      entryCounterRef.current += 1;
      const newEntry: SequenceEntry = {
        uid: `mudra-${entryCounterRef.current}-${drawnMudra.id}`,
        mudra: drawnMudra,
      };

      const next = [...currentSeq, newEntry];
      sequenceRef.current = next;
      setSequence(next);

      // Always wait for the host to explicitly validate the Finale before launching the victory celebration
      mudraAudio.playMudraLand();

      // In Giant Wheel Fullscreen mode, display the chosen mudra card prominently for 5 seconds
      if (isWheelFullscreenRef.current) {
        if (fullscreenRevealLeaveTimerRef.current !== null) {
          window.clearTimeout(fullscreenRevealLeaveTimerRef.current);
        }
        if (fullscreenRevealHideTimerRef.current !== null) {
          window.clearTimeout(fullscreenRevealHideTimerRef.current);
        }
        fullscreenRevealIdRef.current += 1;
        const cardId = fullscreenRevealIdRef.current;
        setFullscreenRevealCard({
          id: cardId,
          stepNumber: next.length,
          mudra: drawnMudra,
          isLeaving: false,
        });
        fullscreenRevealLeaveTimerRef.current = window.setTimeout(() => {
          setFullscreenRevealCard((prev) =>
            prev && prev.id === cardId ? { ...prev, isLeaving: true } : prev,
          );
          fullscreenRevealLeaveTimerRef.current = null;
        }, 4700);
        fullscreenRevealHideTimerRef.current = window.setTimeout(() => {
          setFullscreenRevealCard((prev) => (prev && prev.id === cardId ? null : prev));
          fullscreenRevealHideTimerRef.current = null;
        }, 5000);
      }
    },
    [],
  );

  const handleValidateFinale = useCallback(() => {
    mudraAudio.unlock();
    if (!canValidateFinale) return;
    setIsFinaleValidated(true);
    setShowFinaleBanner(true);
    setTimerStatus((prev) => (prev === 'running' ? 'paused' : prev));
    mudraAudio.playFinaleCelebration();
  }, [canValidateFinale]);

  const handleAdvanceLevel = useCallback(() => {
    mudraAudio.unlock();
    if (!canAdvanceLevel) return;
    const completedLevel = LEVELS[levelIndex];
    const nextIdx = Math.min(LEVELS.length - 1, levelIndex + 1);
    const nextLevel = LEVELS[nextIdx];
    const addedMudras = Math.max(1, nextLevel.targetCount - completedLevel.targetCount);

    setLevelIndex(nextIdx);
    // Reset the 30-second training countdown cleanly for the new level
    lastTimerTickSecRef.current = 0;
    setTimerStatus('idle');
    setRemainingMs(levelTimerSecRef.current * 1000);
    mudraAudio.playLevelAdvance();

    if (levelSuccessTimerRef.current !== null) {
      window.clearTimeout(levelSuccessTimerRef.current);
    }
    levelSuccessIdRef.current += 1;
    setLevelSuccessAnnouncement({
      id: levelSuccessIdRef.current,
      completedLabel: completedLevel.label,
      nextLabel: nextLevel.label,
      addedMudras,
    });
    levelSuccessTimerRef.current = window.setTimeout(() => {
      setLevelSuccessAnnouncement(null);
      levelSuccessTimerRef.current = null;
    }, 2150);
  }, [canAdvanceLevel, levelIndex]);

  const handleSelectLevel = useCallback(
    (nextIdx: number) => {
      if (
        isSpinningRef.current ||
        nextIdx < 0 ||
        nextIdx >= LEVELS.length ||
        nextIdx === levelIndex
      ) {
        return;
      }
      mudraAudio.unlock();
      setLevelIndex(nextIdx);
      // Reset the 1-minute level countdown cleanly for the chosen level
      lastTimerTickSecRef.current = 0;
      setTimerStatus('idle');
      setRemainingMs(levelTimerSecRef.current * 1000);
      mudraAudio.playLevelAdvance();
    },
    [levelIndex],
  );

  const handleUndoLast = useCallback(() => {
    if (isSpinningRef.current || sequenceRef.current.length === 0) return;
    const next = sequenceRef.current.slice(0, -1);
    sequenceRef.current = next;
    setSequence(next);
    if (next.length < maxFinaleCount) {
      setIsFinaleValidated(false);
    }
  }, [maxFinaleCount]);

  const handleSetFamilyLevelResult = useCallback(
    (id: 0 | 1, targetLevelIdx: number, status: LevelAttemptStatus) => {
      mudraAudio.unlock();
      ensureDuelClockStarted();

      const prevTeam = familiesRef.current[id];
      const prevOutcome = prevTeam.outcome;
      const updatedResults = [...prevTeam.levelResults];
      if (targetLevelIdx >= 0 && targetLevelIdx < updatedResults.length) {
        updatedResults[targetLevelIdx] = status;
      }
      const nextOutcome = deriveTeamOutcomeFromLevels(updatedResults);
      const nextMudrasReached =
        nextOutcome === 'pending'
          ? null
          : nextOutcome === 'complete'
            ? maxFinaleCount
            : Math.max(LEVELS[3].targetCount, sequenceRef.current.length);
      const nextElapsedSec =
        nextOutcome === 'pending'
          ? null
          : prevTeam.elapsedSec ?? (duelElapsedSecRef.current > 0 ? duelElapsedSecRef.current : null);

      setFamilies((prev) => {
        const next: [DuelFamilySlot, DuelFamilySlot] = [prev[0], prev[1]];
        next[id] = {
          ...next[id],
          levelResults: updatedResults,
          outcome: nextOutcome,
          mudrasReached: nextMudrasReached,
          elapsedSec: nextElapsedSec,
        };
        return next;
      });

      const unlockedFull = status === 'passed' && nextOutcome === 'complete' && prevOutcome !== 'complete';
      const unlockedHalf = status === 'passed' && nextOutcome === 'partial' && prevOutcome === 'pending';

      if (unlockedFull || unlockedHalf) {
        mudraAudio.playTortueReward(unlockedFull);
      } else if (status !== 'pending') {
        mudraAudio.playTeamLevelVerdict(status === 'passed');
      }
    },
    [ensureDuelClockStarted, maxFinaleCount],
  );

  const handlePreviewOutcome = useCallback((id: 0 | 1) => {
    const team = familiesRef.current[id];
    if (team.outcome === 'pending') return;
    setRewardPreview({
      familyName: getDisplayFamilyName(team.name, id),
      outcome: team.outcome,
      mudrasReached: team.mudrasReached,
      elapsedSec: team.elapsedSec,
    });
  }, []);

  const resetWheelForNextRun = useCallback(() => {
    sequenceRef.current = [];
    setSequence([]);
    setLevelIndex(0);
    lastTimerTickSecRef.current = 0;
    setTimerStatus('idle');
    setRemainingMs(levelTimerSecRef.current * 1000);
    setDuelStartedAtMs(null);
    setDuelElapsedSec(0);
    sessionLastTickSecRef.current = 0;
    sessionRulesChimePlayedRef.current = false;
    setSessionTimerStatus('idle');
    setSessionRemainingMs(SESSION_TOTAL_SECONDS * 1000);
    setIsSequenceHidden(false);
    setZoomedMudraIndex(null);
    setIsSequenceFullscreenOpen(false);
    setShowFinaleBanner(true);
    setIsFinaleValidated(false);
    if (levelSuccessTimerRef.current !== null) {
      window.clearTimeout(levelSuccessTimerRef.current);
      levelSuccessTimerRef.current = null;
    }
    setLevelSuccessAnnouncement(null);
    dismissFullscreenRevealCard();
  }, [dismissFullscreenRevealCard]);

  const handleConfirmReset = useCallback(() => {
    if (isSpinningRef.current) return;
    resetWheelForNextRun();
    setRewardPreview(null);
    setFamilies(createDefaultDuelFamilies());
    setIsResetModalOpen(false);
  }, [resetWheelForNextRun]);

  const handleReturnToHome = useCallback(() => {
    if (isSpinningRef.current) return;
    mudraAudio.stopSpinFairy();
    setZoomedMudraIndex(null);
    setIsSequenceFullscreenOpen(false);
    setIsWheelFullscreen(false);
    setActiveScreen('home');
    window.scrollTo(0, 0);
  }, []);

  const handleEnterGame = useCallback(() => {
    mudraAudio.unlock();
    setIsGameStagePrewarmed(true);
    setActiveScreen('game');
    window.scrollTo(0, 0);
  }, []);

  const handleResetFromHome = useCallback(() => {
    if (isSpinningRef.current) return;
    mudraAudio.unlock();
    resetWheelForNextRun();
    setRewardPreview(null);
    setFamilies(createDefaultDuelFamilies());
    setIsGameStagePrewarmed(true);
    setActiveScreen('game');
    window.scrollTo(0, 0);
  }, [resetWheelForNextRun]);

  const hasActiveGame =
    sequence.length > 0 ||
    families[0].outcome !== 'pending' ||
    families[1].outcome !== 'pending' ||
    countEvaluatedLevels(families[0].levelResults) > 0 ||
    countEvaluatedLevels(families[1].levelResults) > 0;

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
      <CelebrationOverlay active={activeScreen === 'game' && isFinaleCompleted && showFinaleBanner} />

      {/* Brief celebratory "Niveau réussi !" confirmation stamp */}
      <LevelSuccessToast
        announcement={activeScreen === 'game' ? levelSuccessAnnouncement : null}
      />

      {/* Top Bar */}
      <header className="w-full border-b border-[#F5B324]/35 bg-[#3B050A]/90 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={activeScreen === 'game' ? handleReturnToHome : undefined}
            disabled={activeScreen === 'game' && isWheelBusy}
            aria-label={
              activeScreen === 'game'
                ? "Revenir à l'écran d'accueil"
                : 'Le défi des mudras'
            }
            className={`flex items-center gap-2.5 min-w-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
              activeScreen === 'game'
                ? 'cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                : 'cursor-default'
            }`}
          >
            <LotusEmblem className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
            {activeScreen === 'game' ? (
              <h1 className="truncate text-lg font-extrabold tracking-tight text-[#FFF8EA] sm:text-xl xl:text-2xl">
                Le défi des mudras
              </h1>
            ) : (
              <span className="truncate text-lg font-extrabold tracking-tight text-[#FFF8EA] sm:text-xl xl:text-2xl">
                Le défi des mudras
              </span>
            )}
          </button>

          {/* Persistent 8-Minute Session Timer (2 min Règles + 6 min Jeu) */}
          <SessionTimerHeader
            remainingMs={sessionRemainingMs}
            status={sessionTimerStatus}
            onTogglePlayPause={handleToggleSessionTimer}
            onReset={handleResetSessionTimer}
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* One-Click Return to Welcome Screen Button (when in game) */}
            {activeScreen === 'game' && (
              <button
                type="button"
                onClick={handleReturnToHome}
                disabled={isWheelBusy}
                aria-label="Revenir à l'écran d'accueil des joueurs"
                title="Revenir à l'écran d'accueil"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-3 sm:px-3.5 py-2 text-sm font-extrabold text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
              >
                <Home className="h-4 w-4 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                <span className="hidden sm:inline">Accueil</span>
              </button>
            )}

            {/* Compact Inline Music Player (Previous / Play-Pause / Next, zero popup) */}
            <InlineMusicPlayer
              isFallbackSynthPlaying={isMusicPlaying}
              onSetFallbackSynth={handleSetFallbackSynth}
            />

            {/* Wheel Sound Effects Toggle (compact 44x44 button so header never wraps on iPad) */}
            <button
              type="button"
              onClick={handleToggleMute}
              aria-pressed={!isMuted}
              aria-label={isMuted ? 'Activer le son de la roue' : 'Couper le son de la roue'}
              title={isMuted ? 'Activer le son de la roue' : 'Couper le son de la roue'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3 text-sm font-semibold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              {isMuted || sfxVolume <= 0.001 ? (
                <VolumeX className="h-5 w-5 text-[#F3D9A4]/60" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5 text-[#FCD34D]" aria-hidden="true" />
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreenActive ? 'Quitter le plein écran' : 'Plein écran'}
              title={isFullscreenActive ? 'Quitter le plein écran' : 'Plein écran'}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3 py-2 text-sm font-bold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              {isFullscreenActive ? (
                <Minimize2 className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              )}
              <span className="hidden xl:inline">
                {isFullscreenActive ? 'Quitter' : 'Plein écran'}
              </span>
            </button>

            {/* New Game Button (Game view) or Enter Wheel CTA (Home view) */}
            {activeScreen === 'game' ? (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                disabled={isWheelBusy}
                title="Nouvelle partie"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/55 bg-[#7F1119] px-3 py-2 text-sm font-bold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#9E1620] hover:border-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                <span className="hidden lg:inline">Nouvelle partie</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnterGame}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-3.5 sm:px-4 py-2 text-sm font-extrabold text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                <span>{hasActiveGame ? 'Reprendre' : 'Jouer'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Active Screen: Players Welcome Screen + Pre-warmed Instant Game Stage */}
      {activeScreen === 'home' && (
        <HomeScreen
          mudraSprites={mudraSprites}
          hasActiveGame={hasActiveGame}
          onEnterGame={handleEnterGame}
          onResetGame={handleResetFromHome}
        />
      )}

      {(isGameStagePrewarmed || activeScreen === 'game') && (
      <main
        aria-hidden={activeScreen !== 'game'}
        className={`mx-auto w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 py-4 sm:px-6 lg:items-start lg:gap-x-8 lg:gap-y-6 lg:px-8 lg:py-5 ${
          activeScreen === 'game' ? 'flex lg:grid lg:grid-cols-12' : 'hidden'
        }`}
      >
        {/* LEFT COLUMN: Grand 3D Wheel, 30s Training Countdown & Primary Spin Action (or Full-Viewport Giant Wheel Stage) */}
        <section
          aria-label="Roue des Mudras"
          className={
            isWheelFullscreen
              ? 'fixed inset-0 z-50 flex flex-col items-center justify-between gap-2 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4'
              : 'flex flex-col items-center justify-center lg:col-span-7 lg:sticky lg:top-4'
          }
          style={
            isWheelFullscreen
              ? {
                  background:
                    'radial-gradient(circle at 50% 48%, rgba(245, 179, 36, 0.24) 0%, rgba(154, 18, 25, 0.96) 44%, #240306 100%)',
                }
              : undefined
          }
        >
          {/* Top Bar & High-Contrast 7-Level Red/White Strip visible only in Giant Wheel Fullscreen Mode */}
          {isWheelFullscreen && (
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2">
              <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleExitWheelFullscreen()}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border-2 border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-4 sm:px-5 py-2 text-sm sm:text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/40 transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
                >
                  <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
                  <span>Quitter plein écran</span>
                </button>

                {/* High-Contrast Current Level Badge (Red background, Bold White text) */}
                <div className="flex flex-col items-center rounded-xl border-2 border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-4 sm:px-6 py-1.5 text-center shadow-lg shadow-black/45">
                  <p className="text-base sm:text-xl font-extrabold uppercase tracking-wider text-white tabular-nums leading-tight">
                    {currentLevel.label} · {sequence.length} / {targetCount} mudras
                  </p>
                  {sequence.length > 0 && (
                    <p className="mt-0.5 text-xs sm:text-sm font-bold text-white/95">
                      Dernier : #{sequence.length}{' '}
                      {sequence[sequence.length - 1].mudra.name.toUpperCase()} —{' '}
                      {sequence[sequence.length - 1].mudra.meaningFr}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {sequence.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        dismissFullscreenRevealCard();
                        setIsSequenceFullscreenOpen(true);
                      }}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border-2 border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] px-4 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#2B0508] shadow-md shadow-black/30 transition-colors hover:from-[#FCD34D] hover:to-[#EAB308] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap tabular-nums"
                    >
                      <Maximize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Enchaînement ({sequence.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-pressed={!isMuted}
                    aria-label={isMuted ? 'Activer le son de la roue' : 'Couper le son de la roue'}
                    className="inline-flex min-h-[46px] min-w-[46px] items-center justify-center rounded-xl border border-[#F5B324]/55 bg-[#4A070D]/90 text-[#FCD34D] transition-colors hover:bg-[#6E0D15] hover:border-[#FCD34D] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                  >
                    {isMuted || sfxVolume <= 0.001 ? (
                      <VolumeX className="h-5 w-5 text-[#F3D9A4]/60" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-[#FCD34D]" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* All 7 Levels Bar (Red Background, Crisp White Text) */}
              <div
                className="grid w-full max-w-5xl grid-cols-7 gap-1.5"
                role="group"
                aria-label="Niveaux du jeu"
              >
                {LEVELS.map((lvl) => {
                  const isCurrent = lvl.index === levelIndex;
                  const isDone =
                    lvl.index < levelIndex ||
                    (lvl.index === levelIndex && sequence.length >= lvl.targetCount);

                  return (
                    <button
                      key={lvl.index}
                      type="button"
                      onClick={() => handleSelectLevel(lvl.index)}
                      disabled={isWheelBusy}
                      aria-pressed={isCurrent}
                      aria-label={`${lvl.label} — ${lvl.targetCount} mudras`}
                      className={`inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs sm:text-sm font-extrabold text-white tabular-nums transition-all cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                        isCurrent
                          ? 'border-2 border-[#FEF08A] bg-[#DC2626] shadow-lg shadow-black/45 ring-2 ring-[#FCD34D]/60 scale-[1.03]'
                          : isDone
                            ? 'border border-[#FCD34D]/80 bg-[#B91C1C] hover:bg-[#DC2626]'
                            : 'border border-white/25 bg-[#7F1D1D]/90 text-white/90 hover:bg-[#991B1B] hover:text-white'
                      }`}
                    >
                      {isDone && !isCurrent && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#6EE7B7] stroke-[2.75]" aria-hidden="true" />
                      )}
                      <span className="truncate">
                        {lvl.shortLabel} - {lvl.targetCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 30-Second Training Visual Countdown + 8-Minute Duel Elapsed Tracker (normal view) */}
          {!isWheelFullscreen && isLevelTimerEnabled && (
            <CountdownBanner
              levelLabel={currentLevel.label}
              levelSeconds={levelTimerSec}
              remainingMs={remainingMs}
              status={timerStatus}
              duelElapsedSec={duelElapsedSec}
              duelLimitSec={DUEL_LIMIT_SECONDS}
              onStartOrResume={() => startOrResumeTimer(false)}
              onPause={handlePauseTimer}
              onReset={handleResetTimer}
              onAdjustLevelSeconds={handleAdjustLevelSeconds}
            />
          )}

          {/* Warm royal gold aura behind the giant 3D wheel */}
          <div className="relative flex w-full flex-1 flex-col items-center justify-center">
            {/* Always-visible Fullscreen Wheel button in top-right corner of the wheel stage */}
            {!isWheelFullscreen && (
              <button
                type="button"
                onClick={() => void handleEnterWheelFullscreen()}
                aria-label="Afficher la roue en plein écran"
                title="Afficher la roue en plein écran"
                className="absolute right-1 top-1 z-20 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-[#FCD34D]/85 bg-[#3B050A]/90 px-3 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#FFF8EA] shadow-lg shadow-black/40 backdrop-blur-xs transition-colors hover:bg-[#6E0D15] hover:border-[#FEF08A] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <Maximize2 className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                <span>Plein écran</span>
              </button>
            )}

            <div
              className={`pointer-events-none absolute inset-0 m-auto h-[90%] w-[90%] rounded-full opacity-80 ${
                isWheelFullscreen ? 'max-w-[1140px]' : 'max-w-[740px]'
              }`}
              style={{
                background:
                  'radial-gradient(circle, rgba(252,211,77,0.34) 0%, rgba(245,179,36,0.16) 44%, rgba(139,17,26,0) 74%)',
              }}
              aria-hidden="true"
            />

            <MudraWheel3D
              ref={wheelRef}
              canSpin={canSpin}
              canRecordSpin={!hasReachedLevelTarget}
              isSpinning={isSpinning}
              onWheelClick={handleSpin}
              onManualSpinStart={handleManualSpinStart}
              onSpinInterrupt={handleSpinInterrupt}
              onSpinComplete={handleSpinComplete}
              highlightFinale={isFinaleCompleted}
              mudraSprites={mudraSprites}
              fullscreen={isWheelFullscreen}
            />
          </div>

          {/* Primary Red Action CTA & Level Advance CTA directly beneath the wheel */}
          <div
            className={`flex w-full flex-col items-center gap-2.5 ${
              isWheelFullscreen ? 'max-w-[660px]' : 'mt-3 max-w-[620px]'
            }`}
          >
            {hasReachedLevelTarget && !isSpinning && !isFinaleCompleted ? (
              <div
                role="status"
                aria-live="polite"
                className="animate-lotus-reveal flex w-full flex-col items-center justify-center rounded-2xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#FCD34D] via-[#F5B324] to-[#D97706] px-5 py-3.5 text-center text-[#2B0508] shadow-xl shadow-black/40"
              >
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#5C0810] tabular-nums">
                  <Hand className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {currentLevel.label} · {targetCount} / {targetCount} mudras
                  </span>
                </div>
                <p className="mt-1 text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-[#240306] leading-tight">
                  Maintenant, c’est à vous de jouer !
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#4A070D]">
                  Reproduisez les {targetCount} mudras dans l’ordre
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSpin}
                disabled={!canSpin}
                className={`inline-flex w-full min-h-[60px] items-center justify-center gap-2.5 rounded-2xl px-7 py-3.5 text-lg font-extrabold uppercase tracking-wider shadow-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/50 whitespace-nowrap ${
                  canSpin
                    ? 'border-2 border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer shadow-black/35'
                    : 'border border-[#F5B324]/25 bg-[#4A090F]/70 text-[#F3D9A4]/50 cursor-not-allowed shadow-none'
                }`}
              >
                {isSpinning ? (
                  <>
                    <Disc3 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                    <span>LA ROUE TOURNE…</span>
                  </>
                ) : isFinaleCompleted ? (
                  <>
                    <Trophy className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                    <span>FINALE VALIDÉE ({maxFinaleCount} MUDRAS)</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>TOURNER LA ROUE</span>
                  </>
                )}
              </button>
            )}

            {canAdvanceLevel && (
              <button
                type="button"
                onClick={handleAdvanceLevel}
                className="animate-lotus-reveal inline-flex w-full min-h-[58px] items-center justify-center gap-2.5 rounded-2xl border-2 border-[#FDE68A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-3.5 text-base sm:text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/35 transition-all duration-150 hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/55"
              >
                <Check className="h-5 w-5 shrink-0 text-[#6EE7B7] stroke-[2.75]" aria-hidden="true" />
                <span>
                  NIVEAU RÉUSSI : AJOUTER {nextLevelDelta}{' '}
                  {nextLevelDelta > 1 ? 'MUDRAS' : 'MUDRA'}
                </span>
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
            )}

            {canValidateFinale && (
              <button
                type="button"
                onClick={handleValidateFinale}
                className="animate-lotus-reveal inline-flex w-full min-h-[58px] items-center justify-center gap-2.5 rounded-2xl border-2 border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] px-6 py-3.5 text-base sm:text-lg font-extrabold uppercase tracking-wide text-[#2B0508] shadow-lg shadow-black/35 transition-all duration-150 hover:from-[#FCD34D] hover:to-[#EAB308] active:scale-[0.985] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/55"
              >
                <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>VALIDER LA FINALE</span>
              </button>
            )}

            {!isWheelFullscreen && (
              <div className="mt-0.5 flex w-full flex-wrap items-center justify-between gap-2 px-1">
                <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#F3D9A4]/80">
                  <Hand className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span>Tournez, lancez ou arrêtez la roue directement au doigt</span>
                </p>

                {/* Slim Wheel & SFX Volume Slider directly beneath the wheel */}
                <div
                  role="group"
                  aria-label="Volume sonore de la roue"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#F5B324]/35 bg-[#3B050A]/80 px-2.5 py-1.5"
                >
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-pressed={!isMuted}
                    aria-label={isMuted ? 'Activer le son de la roue' : 'Couper le son de la roue'}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#5E0A12] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                  >
                    {isMuted || sfxVolume <= 0.001 ? (
                      <VolumeX className="h-4 w-4 text-[#F3D9A4]/60" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-[#FCD34D]" aria-hidden="true" />
                    )}
                  </button>
                  <span className="text-[11px] font-bold text-[#F3D9A4]">Son roue</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={isMuted ? 0 : Math.round(sfxVolume * 100)}
                    onChange={(e) => handleChangeSfxVolume(Number(e.target.value))}
                    onPointerUp={handlePreviewSfxVolume}
                    onTouchEnd={handlePreviewSfxVolume}
                    onKeyUp={handlePreviewSfxVolume}
                    aria-label="Volume de la roue et des effets sonores"
                    className="h-2 w-24 sm:w-28 cursor-pointer accent-[#F5B324] touch-manipulation"
                  />
                  <span
                    aria-hidden="true"
                    className="w-8 text-right text-[11px] font-extrabold text-[#FDE68A] tabular-nums"
                  >
                    {isMuted ? 0 : Math.round(sfxVolume * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3-Second Drawn Mudra Reveal Card Overlay in Giant Wheel Fullscreen Mode */}
          {isWheelFullscreen && fullscreenRevealCard && (() => {
            const { id, stepNumber, mudra, isLeaving } = fullscreenRevealCard;
            const sprite = mudraSprites[mudra.id];
            return (
              <div
                key={id}
                role="status"
                aria-live="polite"
                onClick={dismissFullscreenRevealCard}
                className="fixed inset-0 z-[54] flex items-center justify-center bg-[#1A0204]/68 p-4 backdrop-blur-xs cursor-pointer"
              >
                <div
                  className={`relative w-full max-w-[430px] overflow-hidden rounded-3xl border-2 border-[#FCD34D] bg-[#3B050A]/98 p-6 sm:p-7 text-center shadow-2xl shadow-black/75 ${
                    isLeaving ? 'animate-level-ok-out' : 'animate-level-ok-in'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 rounded-xl border border-[#FCD34D]/75 bg-[#991B1B] px-3 py-1 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FFF8EA] tabular-nums">
                      <span>Mudra #{stepNumber}</span>
                      <span className="text-[#FDE68A]/80">/ {targetCount}</span>
                    </span>
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-[#FDE68A]/70"
                      style={{ backgroundColor: mudra.colorHex }}
                      aria-hidden="true"
                    />
                  </div>

                  {isSequenceHidden ? (
                    <div
                      aria-label="Image du geste masquée"
                      className="mx-auto flex aspect-square w-full max-w-[260px] sm:max-w-[290px] items-center justify-center rounded-2xl border-2 border-dashed border-[#F5B324]/55 bg-[#240306]/90"
                    >
                      <span className="text-7xl font-extrabold text-[#FCD34D]/65">?</span>
                    </div>
                  ) : (
                    <div className="mx-auto flex aspect-square w-full max-w-[260px] sm:max-w-[290px] items-center justify-center rounded-2xl border-2 border-[#F5B324] bg-[#FFF8EA] p-4 shadow-xl shadow-black/40">
                      {sprite ? (
                        <img
                          src={sprite.dataUrl}
                          alt={`Geste ${mudra.name.toUpperCase()}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Hand className="h-20 w-20 text-[#991B1B]" aria-hidden="true" />
                      )}
                    </div>
                  )}

                  <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold uppercase tracking-wider text-[#FFF8EA]">
                    {mudra.name.toUpperCase()}
                  </h2>
                  <p className="mt-1 text-lg sm:text-xl font-bold text-[#FDE68A]">
                    {mudra.meaningFr}
                  </p>

                  {stepNumber >= targetCount && (
                    <div className="mt-4 rounded-2xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#FCD34D] to-[#D97706] px-4 py-2.5 text-center text-[#2B0508] shadow-lg shadow-black/35">
                      <p className="text-base sm:text-lg font-extrabold uppercase tracking-wide leading-tight">
                        Maintenant, c’est à vous de jouer !
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-[#4A070D] tabular-nums">
                        Fin du {currentLevel.label} · {targetCount} / {targetCount} mudras
                      </p>
                    </div>
                  )}

                  {/* Smooth 5-second visual timer bar */}
                  <div
                    className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#240306]"
                    aria-hidden="true"
                  >
                    <div
                      className="animate-reveal-card-timer h-full w-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #DC2626 0%, #F5B324 58%, #FEF08A 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* RIGHT COLUMN: All Info (Team 1 & Team 2, Les niveaux, Enchaînements) */}
        <section
          aria-label="Équipes, niveaux et enchaînements"
          className="flex flex-col gap-4 lg:col-span-5"
        >
          {/* 1. Team 1 CONTRE Team 2 + validation par niveau */}
          <FamilyDuelBar
            families={families}
            currentLevelIndex={levelIndex}
            currentLevelLabel={currentLevel.label}
            onSetFamilyLevelResult={handleSetFamilyLevelResult}
            onPreviewOutcome={handlePreviewOutcome}
          />
          {/* Finale Victory Banner */}
          {isFinaleCompleted && (
            <div
              role="status"
              aria-live="polite"
              className="animate-lotus-reveal rounded-2xl border-2 border-[#FCD34D] bg-[#3B050A]/92 p-5 text-center shadow-lg shadow-black/35"
            >
              <div className="flex items-center justify-center gap-2.5">
                <Trophy className="h-6 w-6 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                <p className="text-2xl sm:text-[1.65rem] font-extrabold tracking-tight text-[#FDE68A]">
                  Bravo, Maître des Mudras !
                </p>
                <LotusEmblem className="h-7 w-7 shrink-0" />
              </div>
              <p className="mt-1.5 text-sm sm:text-base text-[#FFF8EA]/85">
                Vous avez réussi les {LEVELS.length} niveaux et réuni les {maxFinaleCount} mudras de la Finale.
                Cachez la séquence pour faire la démonstration finale de mémoire !
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>NOUVELLE PARTIE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinaleBanner((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer"
                >
                  {showFinaleBanner ? (
                    <>
                      <Pause className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                      <span>Mettre les pétales en pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                      <span>Relancer la fête</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 1. Level & Progress Panel */}
          <div className="rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-5 shadow-md shadow-black/25 backdrop-blur-xs">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F3D9A4]/80 truncate">
                  <span>{familyADisplayName}</span>
                  <span className="mx-1.5 text-[#FCD34D] font-bold">CONTRE</span>
                  <span>{familyBDisplayName}</span>
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

            {/* 7-step selectable level selector */}
            <div className="mt-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F3D9A4]/75">
                  Choisir un niveau
                </span>
                <span className="text-[11px] font-semibold text-[#FCD34D]/80 tabular-nums">
                  {targetCount} mudras
                </span>
              </div>
              <div
                className="grid grid-cols-2 gap-2 text-center"
                role="group"
                aria-label="Sélectionner le niveau"
              >
                {LEVELS.map((lvl) => {
                  const isDone =
                    lvl.index < levelIndex ||
                    (lvl.index === levelIndex && sequence.length >= lvl.targetCount);
                  const isCurrent = lvl.index === levelIndex;

                  return (
                    <button
                      key={lvl.index}
                      type="button"
                      onClick={() => handleSelectLevel(lvl.index)}
                      disabled={isWheelBusy}
                      aria-pressed={isCurrent}
                      aria-label={`Sélectionner ${lvl.label} (${lvl.targetCount} mudras)`}
                      title={`${lvl.label} · ${lvl.targetCount} mudras`}
                      className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-extrabold tabular-nums transition-all cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                        lvl.isFinale ? 'col-span-2' : ''
                      } ${
                        isCurrent
                          ? 'border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-[#FFF8EA] shadow-sm shadow-black/30 ring-1 ring-[#FCD34D]/50'
                          : isDone
                            ? 'border-[#F5B324]/55 bg-[#F5B324]/18 text-[#FCD34D] hover:border-[#FCD34D] hover:bg-[#7F1119]/80 hover:text-[#FFF8EA]'
                            : 'border-[#F5B324]/25 bg-[#260306]/80 text-[#F3D9A4]/85 hover:border-[#FCD34D]/75 hover:bg-[#5E0A12] hover:text-[#FFF8EA]'
                      }`}
                    >
                      {lvl.isFinale && (
                        <Trophy className="h-3.5 w-3.5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                      )}
                      <span className="truncate">
                        {lvl.isFinale
                          ? `Niv. 7 · ${lvl.shortLabel} - ${lvl.targetCount} Mudras (100%)`
                          : lvl.index === 3
                            ? `${lvl.shortLabel} - ${lvl.targetCount} Mudras (½)`
                            : `${lvl.shortLabel} - ${lvl.targetCount} Mudras`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 30-Second Family Practice Chrono Toggle & Duration Adjuster */}
            <div className="mt-4 border-t border-[#F5B324]/20 pt-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Timer className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span className="text-sm font-bold text-[#FFF8EA] truncate">
                    Chrono entraînement (30 s)
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLevelTimerEnabled && (
                    <div className="inline-flex items-center rounded-xl border border-[#F5B324]/35 bg-[#240306]/85 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleAdjustLevelSeconds(-15)}
                        disabled={levelTimerSec <= 15}
                        aria-label="Réduire de 15 secondes"
                        title="Réduire de 15 secondes"
                        className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#5E0A12] disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-[52px] px-1.5 text-center text-xs font-extrabold text-[#FFF8EA] tabular-nums">
                        {levelTimerSec % 60 === 0
                          ? `${levelTimerSec / 60} min`
                          : `${levelTimerSec} s`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustLevelSeconds(15)}
                        disabled={levelTimerSec >= 300}
                        aria-label="Ajouter 15 secondes"
                        title="Ajouter 15 secondes"
                        className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#5E0A12] disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isLevelTimerEnabled}
                    onClick={handleToggleLevelTimer}
                    className={`inline-flex min-h-[42px] items-center justify-center rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0 ${
                      isLevelTimerEnabled
                        ? 'border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
                        : 'border-[#F5B324]/45 bg-[#5E0A12] text-[#FFF8EA] hover:bg-[#7A1019] hover:border-[#FCD34D]'
                    }`}
                  >
                    {isLevelTimerEnabled ? 'Activé' : 'Activer'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Enchaînements List & Controls (simplified — replaces redundant spotlight card) */}
          <div
            aria-live="polite"
            className="flex flex-col rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-5 shadow-md shadow-black/25 backdrop-blur-xs"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[#FFF8EA]">
                Enchaînements
              </h2>
              <span className="text-xs font-semibold text-[#F3D9A4]/80 tabular-nums">
                {isSpinning
                  ? 'Tirage en cours…'
                  : sequence.length === 0
                    ? 'Aucun mudra tiré'
                    : `${sequence.length} ${sequence.length > 1 ? 'étapes' : 'étape'}`}
              </span>
            </div>

            {/* Ordered Enchaînements List */}
            {sequence.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#F5B324]/30 bg-[#240306]/60 px-4 py-6 text-center text-sm text-[#F3D9A4]/75">
                {isSpinning
                  ? 'La roue tourne…'
                  : `Les mudras tirés apparaîtront ici dans l’ordre, numérotés de 1 à ${targetCount}.`}
              </div>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {sequence.map((entry, idx) => {
                  const isNewest = idx === sequence.length - 1;
                  if (isSequenceHidden) {
                    return (
                      <li
                        key={entry.uid}
                        className={`animate-lotus-reveal flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                          isNewest
                            ? 'border-[#FCD34D]/80 bg-[#5E0A12]/90'
                            : 'border-[#F5B324]/25 bg-[#240306]/75'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FCD34D]/55 bg-[#991B1B] text-sm font-extrabold text-[#FFF8EA] tabular-nums">
                            {idx + 1}
                          </span>
                          <div
                            aria-label="Image du geste masquée"
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#F5B324]/55 bg-[#1E0205]/90 text-lg font-extrabold text-[#FCD34D]/75"
                          >
                            ?
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-base sm:text-lg font-extrabold uppercase leading-tight tracking-wide text-[#FFF8EA]">
                              {entry.mudra.name.toUpperCase()}
                            </span>
                            <span className="truncate text-xs sm:text-sm font-semibold text-[#FDE68A]/90">
                              {entry.mudra.meaningFr}
                            </span>
                          </div>
                        </div>
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#FDE68A]/50"
                          style={{ backgroundColor: entry.mudra.colorHex }}
                          aria-hidden="true"
                        />
                      </li>
                    );
                  }

                  return (
                    <li key={entry.uid} className="animate-lotus-reveal">
                      <button
                        type="button"
                        onClick={() => setZoomedMudraIndex(idx)}
                        aria-label={`Agrandir le mudra ${entry.mudra.name.toUpperCase()} en plein écran`}
                        title="Cliquer pour agrandir en plein écran"
                        className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] ${
                          isNewest
                            ? 'border-[#FCD34D]/80 bg-[#5E0A12]/90 hover:border-[#FDE68A] hover:bg-[#7A1019]'
                            : 'border-[#F5B324]/25 bg-[#240306]/75 hover:border-[#FCD34D]/75 hover:bg-[#4A070D]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FCD34D]/55 bg-[#991B1B] text-sm font-extrabold text-[#FFF8EA] tabular-nums">
                            {idx + 1}
                          </span>
                          {mudraSprites[entry.mudra.id] && (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#F5B324]/80 bg-[#FFF8EA] p-1 transition-transform duration-150 group-hover:scale-105 group-hover:border-[#FCD34D]">
                              <img
                                src={mudraSprites[entry.mudra.id].dataUrl}
                                alt={`Geste ${entry.mudra.name.toUpperCase()}`}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-base sm:text-lg font-extrabold uppercase leading-tight tracking-wide text-[#FFF8EA]">
                              {entry.mudra.name.toUpperCase()}
                            </span>
                            <span className="truncate text-xs sm:text-sm font-semibold text-[#FDE68A]/90">
                              {entry.mudra.meaningFr}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <Maximize2
                            className="h-4 w-4 text-[#FCD34D]/70 transition-colors group-hover:text-[#FCD34D]"
                            aria-hidden="true"
                          />
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#FDE68A]/50"
                            style={{ backgroundColor: entry.mudra.colorHex }}
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Fullscreen Sequence Showcase Trigger + Memorization & Undo Controls */}
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setIsSequenceFullscreenOpen(true)}
                disabled={sequence.length === 0}
                className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] px-4 py-2.5 text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#2B0508] shadow-md shadow-black/25 transition-colors hover:from-[#FCD34D] hover:to-[#EAB308] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                <Maximize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Afficher l’enchaînement en plein écran</span>
              </button>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsSequenceHidden((prev) => !prev)}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap ${
                  isSequenceHidden
                    ? 'border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
                    : 'border-[#F5B324]/50 bg-[#7F1119] text-[#FFF8EA] hover:bg-[#9E1620] hover:border-[#FCD34D]'
                }`}
              >
                {isSequenceHidden ? (
                  <>
                    <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Afficher les images</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                    <span>Cacher les images</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleUndoLast}
                disabled={sequence.length === 0 || isWheelBusy}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                <Undo2 className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                <span>Annuler le dernier</span>
              </button>
              </div>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                disabled={!canResetCurrentRun || isWheelBusy}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#FCA5A5]/45 bg-[#4A070D] px-4 py-2.5 text-sm font-extrabold text-[#FEE2E2] transition-colors hover:bg-[#6E0D15] hover:border-[#FCA5A5] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-[#FCA5A5]" aria-hidden="true" />
                <span>Reset du jeu</span>
              </button>
            </div>
          </div>
        </section>
      </main>
      )}

      {/* Golden Turtle Reward Modal (triggered from Team 1 / Team 2 reward badge) */}
      <TortueRewardModal
        rewardPreview={rewardPreview}
        onClose={() => setRewardPreview(null)}
      />

      {/* New Game / Reset Confirmation Modal (never uses window.confirm) */}
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
                Réinitialiser la partie ?
              </h2>
            </div>

            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#F3D9A4]/88">
              Tous les mudras tirés, la progression des niveaux ({currentLevel.label}) et
              les validations de Team 1 et Team 2 seront réinitialisés au Niveau 1.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="min-h-[48px] rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-5 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>OUI, RESET LE JEU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Complete Enchaînements Popup (all drawn mudras at once for audience visibility) */}
      {isSequenceFullscreenOpen && sequence.length > 0 && (() => {
        const isCompactGrid = sequence.length >= 9;
        const cardWidthClass =
          sequence.length <= 2
            ? 'w-[calc(50%-0.5rem)] sm:w-[min(42vw,340px)]'
            : sequence.length === 3
              ? 'w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.9rem)] max-w-[330px]'
              : sequence.length === 5 || sequence.length === 6
                ? 'w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1rem)] max-w-[310px]'
                : sequence.length <= 8
                  ? 'w-[calc(50%-0.5rem)] md:w-[calc(25%-1rem)] max-w-[290px]'
                  : 'w-[calc(50%-0.5rem)] sm:w-[calc(25%-0.9rem)] lg:w-[calc(20%-0.9rem)] xl:w-[calc(16.666%-0.95rem)] max-w-[225px]';

        return (
          <div
            className="fixed inset-0 z-[58] flex flex-col justify-between overflow-y-auto bg-[#2B0408]/98 px-4 py-4 sm:px-8 sm:py-6 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fullscreen-sequence-title"
          >
            {/* Top Bar: Prominent Retour + Level/Matchup Title + Cacher/Afficher */}
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSequenceFullscreenOpen(false)}
                className="inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-xl border-2 border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/40 transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Retour</span>
              </button>

              <div className="text-center">
                <h2
                  id="fullscreen-sequence-title"
                  className="text-xl sm:text-3xl font-extrabold uppercase tracking-wider text-[#FFF8EA]"
                >
                  Enchaînement · {currentLevel.label}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#FDE68A]/90 tabular-nums">
                  {sequence.length} {sequence.length > 1 ? 'mudras sortis' : 'mudra sorti'} sur {targetCount}
                  {' · '}
                  {familyADisplayName} CONTRE {familyBDisplayName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSequenceHidden((prev) => !prev)}
                className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border-2 px-5 py-2.5 text-sm sm:text-base font-extrabold uppercase tracking-wide transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap ${
                  isSequenceHidden
                    ? 'border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
                    : 'border-[#F5B324]/60 bg-[#5E0A12] text-[#FFF8EA] hover:bg-[#7A1019] hover:border-[#FCD34D]'
                }`}
              >
                {isSequenceHidden ? (
                  <>
                    <Eye className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>Afficher les images</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                    <span>Cacher les images</span>
                  </>
                )}
              </button>
            </div>

            {/* Center Stage: All Currently Drawn Mudras Displayed Huge in Exact Order */}
            <div className="mx-auto my-5 flex w-full max-w-7xl flex-1 items-center justify-center">
              <ol className="flex w-full flex-wrap items-stretch justify-center gap-3.5 sm:gap-5">
                {sequence.map((entry, idx) => {
                  const sprite = mudraSprites[entry.mudra.id];
                  if (isSequenceHidden) {
                    return (
                      <li
                        key={entry.uid}
                        className={`animate-lotus-reveal flex ${cardWidthClass} flex-col items-center rounded-2xl border-2 border-[#F5B324]/55 bg-[#3B050A]/92 ${
                          isCompactGrid ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
                        } text-center shadow-xl shadow-black/40`}
                      >
                        <div className="mb-2 flex w-full items-center justify-between gap-2">
                          <span
                            className={`flex shrink-0 items-center justify-center rounded-xl border border-[#FCD34D]/75 bg-[#991B1B] font-extrabold text-[#FFF8EA] tabular-nums ${
                              isCompactGrid ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-lg'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <EyeOff
                            className="h-4 w-4 shrink-0 text-[#FCD34D]/55"
                            aria-hidden="true"
                          />
                        </div>

                        <div
                          aria-label="Image du geste masquée"
                          className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#F5B324]/45 bg-[#240306]/85"
                        >
                          <span
                            className={`font-extrabold text-[#FCD34D]/60 ${
                              isCompactGrid ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-7xl'
                            }`}
                          >
                            ?
                          </span>
                        </div>

                        <span
                          className={`w-full truncate font-extrabold uppercase tracking-wide text-[#FFF8EA] ${
                            isCompactGrid
                              ? 'mt-2 text-sm sm:text-base'
                              : 'mt-3 text-lg sm:text-xl lg:text-2xl'
                          }`}
                        >
                          {entry.mudra.name.toUpperCase()}
                        </span>

                        <span
                          className={`mt-0.5 w-full truncate font-bold text-[#FDE68A] ${
                            isCompactGrid ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                          }`}
                        >
                          {entry.mudra.meaningFr}
                        </span>

                        <span
                          className="mt-2.5 h-1.5 w-14 rounded-full"
                          style={{ backgroundColor: entry.mudra.colorHex }}
                          aria-hidden="true"
                        />
                      </li>
                    );
                  }

                  return (
                    <li
                      key={entry.uid}
                      className={`animate-lotus-reveal flex ${cardWidthClass}`}
                    >
                      <button
                        type="button"
                        onClick={() => setZoomedMudraIndex(idx)}
                        aria-label={`Agrandir le mudra ${entry.mudra.name.toUpperCase()} en plein écran`}
                        className={`group flex w-full flex-col items-center rounded-2xl border-2 border-[#F5B324]/70 bg-[#3B050A]/92 ${
                          isCompactGrid ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
                        } text-center shadow-xl shadow-black/40 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#FDE68A] hover:bg-[#52080F] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]`}
                      >
                        <div className="mb-2 flex w-full items-center justify-between gap-2">
                          <span
                            className={`flex shrink-0 items-center justify-center rounded-xl border border-[#FCD34D]/75 bg-[#991B1B] font-extrabold text-[#FFF8EA] tabular-nums ${
                              isCompactGrid ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-lg'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <Maximize2
                            className="h-4 w-4 shrink-0 text-[#FCD34D]/70 transition-colors group-hover:text-[#FCD34D]"
                            aria-hidden="true"
                          />
                        </div>

                        <div
                          className={`flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-[#F5B324] bg-[#FFF8EA] shadow-inner transition-transform duration-150 group-hover:scale-[1.02] ${
                            isCompactGrid ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'
                          }`}
                        >
                          {sprite ? (
                            <img
                              src={sprite.dataUrl}
                              alt={`Geste ${entry.mudra.name.toUpperCase()}`}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Hand className="h-16 w-16 text-[#991B1B]" aria-hidden="true" />
                          )}
                        </div>

                        <span
                          className={`w-full truncate font-extrabold uppercase tracking-wide text-[#FFF8EA] ${
                            isCompactGrid
                              ? 'mt-2 text-sm sm:text-base'
                              : 'mt-3 text-lg sm:text-xl lg:text-2xl'
                          }`}
                        >
                          {entry.mudra.name.toUpperCase()}
                        </span>

                        <span
                          className={`mt-0.5 w-full truncate font-bold text-[#FDE68A] ${
                            isCompactGrid ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                          }`}
                        >
                          {entry.mudra.meaningFr}
                        </span>

                        <span
                          className="mt-2.5 h-1.5 w-14 rounded-full"
                          style={{ backgroundColor: entry.mudra.colorHex }}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Bottom Action Bar */}
            <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
              <button
                type="button"
                onClick={() => setIsSequenceFullscreenOpen(false)}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-7 py-2.5 text-sm sm:text-base font-extrabold uppercase tracking-wide text-white shadow-md transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Retour à la roue</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Fullscreen Mudra Lightbox ("Enchaînements" click-to-zoom) */}
      {zoomedMudraIndex !== null && !isSequenceHidden && sequence[zoomedMudraIndex] && (() => {
        const zoomedEntry = sequence[zoomedMudraIndex];
        const zoomedSprite = mudraSprites[zoomedEntry.mudra.id];
        return (
          <div
            className="fixed inset-0 z-[60] flex flex-col justify-between bg-[#2B0408]/98 px-4 py-4 sm:px-8 sm:py-6 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="zoomed-mudra-title"
          >
            {/* Top Bar: Prominent "Retour" button + step metadata */}
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setZoomedMudraIndex(null)}
                className="inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-xl border-2 border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/40 transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Retour</span>
              </button>

              <div className="text-right tabular-nums">
                <p className="text-sm sm:text-base font-extrabold text-[#FCD34D]">
                  Étape {zoomedMudraIndex + 1} / {sequence.length}
                </p>
                <p className="text-xs font-semibold text-[#F3D9A4]/75">
                  {currentLevel.label}
                </p>
              </div>
            </div>

            {/* Center Stage: Giant Mudra Hand Illustration + Name */}
            <div className="mx-auto my-4 flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 sm:gap-7 min-h-0">
              <div className="animate-lotus-reveal flex aspect-square max-h-[56vh] w-full max-w-[min(82vw,520px)] items-center justify-center rounded-3xl border-4 border-[#F5B324] bg-[#FFF8EA] p-6 sm:p-10 shadow-2xl shadow-black/50">
                {zoomedSprite ? (
                  <img
                    src={zoomedSprite.dataUrl}
                    alt={`Geste ${zoomedEntry.mudra.name.toUpperCase()}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Hand
                    className="h-32 w-32 text-[#991B1B]"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="flex flex-col items-center text-center">
                <h2
                  id="zoomed-mudra-title"
                  className="text-3xl sm:text-5xl font-extrabold uppercase tracking-wider text-[#FFF8EA]"
                >
                  {zoomedEntry.mudra.name.toUpperCase()}
                </h2>
                <p className="mt-1.5 text-lg sm:text-2xl font-bold text-[#FDE68A]">
                  {zoomedEntry.mudra.meaningFr}
                </p>
                <span
                  className="mt-3 h-1.5 w-24 rounded-full"
                  style={{ backgroundColor: zoomedEntry.mudra.colorHex }}
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Bottom Controls: Prev / Next + Retour à la roue */}
            <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-3">
              {sequence.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setZoomedMudraIndex(
                      (zoomedMudraIndex - 1 + sequence.length) % sequence.length,
                    )
                  }
                  aria-label="Mudra précédent"
                  className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/50 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
                >
                  <ChevronLeft className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span className="hidden sm:inline">Précédent</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setZoomedMudraIndex(null)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-2.5 text-sm sm:text-base font-extrabold uppercase tracking-wide text-white shadow-md transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Retour à la roue</span>
              </button>

              {sequence.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setZoomedMudraIndex((zoomedMudraIndex + 1) % sequence.length)
                  }
                  aria-label="Mudra suivant"
                  className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/50 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
