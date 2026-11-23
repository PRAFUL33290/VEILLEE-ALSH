import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Disc3,
  Eye,
  EyeOff,
  Hand,
  Maximize2,
  Minimize2,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
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
import { CountdownBanner, TimerStatus } from './components/CountdownBanner';
import {
  DuelFamilySlot,
  FamilyDuelBar,
  FamilyOutcome,
  LevelAttemptStatus,
  SavedDuelRecord,
  TortueRewardPreview,
  countEvaluatedLevels,
  createEmptyLevelResults,
  getDisplayFamilyName,
  sanitizeLevelResults,
} from './components/FamilyDuelBar';
import { DuelHistoryModal } from './components/DuelHistoryModal';

const CURRENT_DUEL_STORAGE_KEY = 'mudra-current-duel-v2';
const SAVED_DUELS_STORAGE_KEY = 'mudra-saved-duels-v1';
const DEFAULT_LEVEL_TIMER_SECONDS = 60; // 1 minute per level
const DUEL_LIMIT_SECONDS = 8 * 60; // 8 minutes total per duel

function createDefaultDuelFamilies(): [DuelFamilySlot, DuelFamilySlot] {
  return [
    {
      id: 0,
      name: '',
      outcome: 'pending',
      levelResults: createEmptyLevelResults(),
      mudrasReached: null,
      elapsedSec: null,
    },
    {
      id: 1,
      name: '',
      outcome: 'pending',
      levelResults: createEmptyLevelResults(),
      mudrasReached: null,
      elapsedSec: null,
    },
  ];
}

function sanitizeOutcome(value: unknown): FamilyOutcome {
  if (value === 'complete' || value === 'partial' || value === 'pending') return value;
  return 'pending';
}

function loadCurrentDuelFamilies(): [DuelFamilySlot, DuelFamilySlot] {
  if (typeof window === 'undefined') return createDefaultDuelFamilies();
  try {
    const raw = window.localStorage.getItem(CURRENT_DUEL_STORAGE_KEY);
    if (!raw) return createDefaultDuelFamilies();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length === 2) {
      const f0 = parsed[0] as Partial<DuelFamilySlot>;
      const f1 = parsed[1] as Partial<DuelFamilySlot>;
      return [
        {
          id: 0,
          name: typeof f0?.name === 'string' ? f0.name.slice(0, 32) : '',
          outcome: sanitizeOutcome(f0?.outcome),
          levelResults: sanitizeLevelResults(f0?.levelResults),
          mudrasReached: typeof f0?.mudrasReached === 'number' ? f0.mudrasReached : null,
          elapsedSec: typeof f0?.elapsedSec === 'number' ? f0.elapsedSec : null,
        },
        {
          id: 1,
          name: typeof f1?.name === 'string' ? f1.name.slice(0, 32) : '',
          outcome: sanitizeOutcome(f1?.outcome),
          levelResults: sanitizeLevelResults(f1?.levelResults),
          mudrasReached: typeof f1?.mudrasReached === 'number' ? f1.mudrasReached : null,
          elapsedSec: typeof f1?.elapsedSec === 'number' ? f1.elapsedSec : null,
        },
      ];
    }
  } catch {
    // Ignore storage access errors
  }
  return createDefaultDuelFamilies();
}

function loadSavedDuels(): SavedDuelRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_DUELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SavedDuelRecord => Boolean(item && typeof item === 'object'))
      .map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id : `duel-${idx}`,
        duelNumber: typeof item.duelNumber === 'number' ? item.duelNumber : idx + 1,
        recordedAtIso:
          typeof item.recordedAtIso === 'string'
            ? item.recordedAtIso
            : new Date().toISOString(),
        familyA: {
          name: typeof item.familyA?.name === 'string' ? item.familyA.name : 'FAMILLE 1',
          outcome: sanitizeOutcome(item.familyA?.outcome),
          levelResults: sanitizeLevelResults(item.familyA?.levelResults),
          mudrasReached:
            typeof item.familyA?.mudrasReached === 'number'
              ? item.familyA.mudrasReached
              : null,
          elapsedSec:
            typeof item.familyA?.elapsedSec === 'number' ? item.familyA.elapsedSec : null,
        },
        familyB: {
          name: typeof item.familyB?.name === 'string' ? item.familyB.name : 'FAMILLE 2',
          outcome: sanitizeOutcome(item.familyB?.outcome),
          levelResults: sanitizeLevelResults(item.familyB?.levelResults),
          mudrasReached:
            typeof item.familyB?.mudrasReached === 'number'
              ? item.familyB.mudrasReached
              : null,
          elapsedSec:
            typeof item.familyB?.elapsedSec === 'number' ? item.familyB.elapsedSec : null,
        },
      }));
  } catch {
    return [];
  }
}

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
  const timerDeadlineRef = useRef<number>(0);
  const lastTimerTickSecRef = useRef<number>(0);

  const [levelIndex, setLevelIndex] = useState(0);
  const [sequence, setSequence] = useState<SequenceEntry[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<DuplicateNotice | null>(null);
  const [isSequenceHidden, setIsSequenceHidden] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [showFinaleBanner, setShowFinaleBanner] = useState(true);
  const [mudraSprites, setMudraSprites] = useState<Record<number, MudraSpriteAsset>>({});

  // Per-level 1-minute Chrono + total duel elapsed tracker (toward 8 min limit)
  const [isLevelTimerEnabled, setIsLevelTimerEnabled] = useState(true);
  const [levelTimerSec, setLevelTimerSec] = useState(DEFAULT_LEVEL_TIMER_SECONDS);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_LEVEL_TIMER_SECONDS * 1000);
  const [duelStartedAtMs, setDuelStartedAtMs] = useState<number | null>(null);
  const [duelElapsedSec, setDuelElapsedSec] = useState<number>(0);

  // 2-Family Simultaneous Duel & Persistent Matchup History ("Carnet des duels") state
  const [families, setFamilies] =
    useState<[DuelFamilySlot, DuelFamilySlot]>(loadCurrentDuelFamilies);
  const [savedDuels, setSavedDuels] = useState<SavedDuelRecord[]>(loadSavedDuels);
  const [rewardPreview, setRewardPreview] = useState<TortueRewardPreview | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [hasUnsavedDuelChanges, setHasUnsavedDuelChanges] = useState(false);
  const [clearFamilyNamesOnReset, setClearFamilyNamesOnReset] = useState(false);

  const familiesRef = useRef(families);
  familiesRef.current = families;
  const levelTimerSecRef = useRef(levelTimerSec);
  levelTimerSecRef.current = levelTimerSec;
  const duelElapsedSecRef = useRef(duelElapsedSec);
  duelElapsedSecRef.current = duelElapsedSec;
  const saveFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CURRENT_DUEL_STORAGE_KEY, JSON.stringify(families));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }, [families]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_DUELS_STORAGE_KEY, JSON.stringify(savedDuels));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }, [savedDuels]);

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
      if (saveFeedbackTimerRef.current !== null) {
        window.clearTimeout(saveFeedbackTimerRef.current);
      }
      mudraAudio.setMusicPlaying(false);
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
  const familyADisplayName = getDisplayFamilyName(families[0].name, 0);
  const familyBDisplayName = getDisplayFamilyName(families[1].name, 1);

  const levelProgressPercent = Math.min(100, Math.round((sequence.length / targetCount) * 100));

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

  // Drift-free 60fps countdown loop for the 1-minute per-level timer
  useEffect(() => {
    if (!isLevelTimerEnabled || timerStatus !== 'running') return;

    let rafId = 0;
    const step = () => {
      const nextMs = Math.max(0, timerDeadlineRef.current - performance.now());
      setRemainingMs(nextMs);

      if (nextMs > 0 && nextMs <= 10000) {
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
      return next;
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    mudraAudio.unlock();
    setIsMusicPlaying((prev) => {
      const next = !prev;
      mudraAudio.setMusicPlaying(next);
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

  const handleSpin = useCallback(() => {
    mudraAudio.unlock();
    if (isSpinningRef.current || hasReachedLevelTarget || duplicateNotice !== null) return;
    ensureDuelClockStarted();
    launchWheelSpin();
  }, [hasReachedLevelTarget, duplicateNotice, ensureDuelClockStarted, launchWheelSpin]);

  const handleManualSpinStart = useCallback(() => {
    isSpinningRef.current = true;
    setIsSpinning(true);
    ensureDuelClockStarted();
  }, [ensureDuelClockStarted]);

  const handleSpinInterrupt = useCallback(() => {
    if (autoRespinTimerRef.current !== null) {
      window.clearTimeout(autoRespinTimerRef.current);
      autoRespinTimerRef.current = null;
    }
    isSpinningRef.current = false;
    setIsSpinning(false);
    setDuplicateNotice(null);
  }, []);

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
    mudraAudio.unlock();
    if (!canAdvanceLevel) return;
    const nextIdx = Math.min(LEVELS.length - 1, levelIndex + 1);
    setLevelIndex(nextIdx);
    // Reset the 1-minute level countdown cleanly for the new level
    lastTimerTickSecRef.current = 0;
    setTimerStatus('idle');
    setRemainingMs(levelTimerSecRef.current * 1000);
    mudraAudio.playLevelAdvance();
  }, [canAdvanceLevel, levelIndex]);

  const handleUndoLast = useCallback(() => {
    if (isSpinningRef.current || duplicateNotice !== null || sequenceRef.current.length === 0) return;
    const next = sequenceRef.current.slice(0, -1);
    sequenceRef.current = next;
    setSequence(next);
  }, [duplicateNotice]);

  const showSaveToast = useCallback((message: string) => {
    setSaveFeedback(message);
    if (saveFeedbackTimerRef.current !== null) {
      window.clearTimeout(saveFeedbackTimerRef.current);
    }
    saveFeedbackTimerRef.current = window.setTimeout(() => {
      setSaveFeedback(null);
      saveFeedbackTimerRef.current = null;
    }, 3400);
  }, []);

  const handleRenameFamily = useCallback((id: 0 | 1, name: string) => {
    setFamilies((prev) => {
      const next: [DuelFamilySlot, DuelFamilySlot] = [prev[0], prev[1]];
      next[id] = { ...next[id], name };
      return next;
    });
    setHasUnsavedDuelChanges(true);
  }, []);

  const handleSetFamilyLevelResult = useCallback(
    (id: 0 | 1, targetLevelIdx: number, status: LevelAttemptStatus) => {
      mudraAudio.unlock();
      ensureDuelClockStarted();

      setFamilies((prev) => {
        const next: [DuelFamilySlot, DuelFamilySlot] = [prev[0], prev[1]];
        const updatedResults = [...next[id].levelResults];
        if (targetLevelIdx >= 0 && targetLevelIdx < updatedResults.length) {
          updatedResults[targetLevelIdx] = status;
        }
        next[id] = {
          ...next[id],
          levelResults: updatedResults,
        };
        return next;
      });
      setHasUnsavedDuelChanges(true);

      if (status !== 'pending') {
        mudraAudio.playTeamLevelVerdict(status === 'passed');
      }
    },
    [ensureDuelClockStarted],
  );

  const handleSetFamilyOutcome = useCallback(
    (id: 0 | 1, outcome: FamilyOutcome) => {
      mudraAudio.unlock();
      const target = familiesRef.current[id];
      const mudrasReached =
        outcome === 'pending'
          ? null
          : outcome === 'complete'
            ? maxFinaleCount
            : target.mudrasReached ?? sequenceRef.current.length;

      const elapsedSec =
        outcome === 'pending'
          ? null
          : target.elapsedSec ?? (duelElapsedSecRef.current > 0 ? duelElapsedSecRef.current : null);

      setFamilies((prev) => {
        const next: [DuelFamilySlot, DuelFamilySlot] = [prev[0], prev[1]];
        next[id] = {
          ...next[id],
          outcome,
          mudrasReached,
          elapsedSec,
        };
        return next;
      });
      setHasUnsavedDuelChanges(true);

      if (outcome !== 'pending') {
        setRewardPreview({
          familyName: getDisplayFamilyName(target.name, id),
          outcome,
          mudrasReached,
          elapsedSec,
        });
        mudraAudio.playTortueReward(outcome === 'complete');
      }
    },
    [maxFinaleCount],
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
    if (autoRespinTimerRef.current !== null) {
      window.clearTimeout(autoRespinTimerRef.current);
      autoRespinTimerRef.current = null;
    }
    sequenceRef.current = [];
    setSequence([]);
    setDuplicateNotice(null);
    setLevelIndex(0);
    lastTimerTickSecRef.current = 0;
    setTimerStatus('idle');
    setRemainingMs(levelTimerSecRef.current * 1000);
    setDuelStartedAtMs(null);
    setDuelElapsedSec(0);
    setIsSequenceHidden(false);
    setShowFinaleBanner(true);
  }, []);

  const handleSaveDuel = useCallback(() => {
    const [f0, f1] = familiesRef.current;
    const nextNumber =
      savedDuels.reduce((max, d) => Math.max(max, d.duelNumber), 0) + 1;

    const record: SavedDuelRecord = {
      id: `duel-${Date.now()}-${nextNumber}`,
      duelNumber: nextNumber,
      recordedAtIso: new Date().toISOString(),
      familyA: {
        name: getDisplayFamilyName(f0.name, 0),
        outcome: f0.outcome,
        levelResults: [...f0.levelResults],
        mudrasReached: f0.mudrasReached,
        elapsedSec: f0.elapsedSec,
      },
      familyB: {
        name: getDisplayFamilyName(f1.name, 1),
        outcome: f1.outcome,
        levelResults: [...f1.levelResults],
        mudrasReached: f1.mudrasReached,
        elapsedSec: f1.elapsedSec,
      },
    };

    setSavedDuels((prev) => [record, ...prev]);
    setHasUnsavedDuelChanges(false);
    showSaveToast(`Duel #${nextNumber} enregistré`);
  }, [savedDuels, showSaveToast]);

  const handleStartNewDuel = useCallback(() => {
    if (isSpinningRef.current) return;
    const [f0, f1] = familiesRef.current;
    const hasContent =
      f0.name.trim().length > 0 ||
      f1.name.trim().length > 0 ||
      f0.outcome !== 'pending' ||
      f1.outcome !== 'pending' ||
      countEvaluatedLevels(f0.levelResults) > 0 ||
      countEvaluatedLevels(f1.levelResults) > 0;

    // Protect host from losing a completed matchup if they forgot to click "Enregistrer le duel"
    if (hasUnsavedDuelChanges && hasContent) {
      const nextNumber =
        savedDuels.reduce((max, d) => Math.max(max, d.duelNumber), 0) + 1;
      const autoRecord: SavedDuelRecord = {
        id: `duel-${Date.now()}-${nextNumber}`,
        duelNumber: nextNumber,
        recordedAtIso: new Date().toISOString(),
        familyA: {
          name: getDisplayFamilyName(f0.name, 0),
          outcome: f0.outcome,
          levelResults: [...f0.levelResults],
          mudrasReached: f0.mudrasReached,
          elapsedSec: f0.elapsedSec,
        },
        familyB: {
          name: getDisplayFamilyName(f1.name, 1),
          outcome: f1.outcome,
          levelResults: [...f1.levelResults],
          mudrasReached: f1.mudrasReached,
          elapsedSec: f1.elapsedSec,
        },
      };
      setSavedDuels((prev) => [autoRecord, ...prev]);
      showSaveToast(`Duel #${nextNumber} archivé · prêt pour le suivant`);
    } else {
      showSaveToast('Prêt pour un nouveau duel');
    }

    setFamilies(createDefaultDuelFamilies());
    setHasUnsavedDuelChanges(false);
    setRewardPreview(null);
    resetWheelForNextRun();
  }, [hasUnsavedDuelChanges, savedDuels, showSaveToast, resetWheelForNextRun]);

  const handleUpdateSavedDuelOutcome = useCallback(
    (duelId: string, side: 'familyA' | 'familyB', outcome: FamilyOutcome) => {
      setSavedDuels((prev) =>
        prev.map((d) => {
          if (d.id !== duelId) return d;
          return {
            ...d,
            [side]: {
              ...d[side],
              outcome,
            },
          };
        }),
      );
    },
    [],
  );

  const handleUpdateSavedDuelLevelResult = useCallback(
    (
      duelId: string,
      side: 'familyA' | 'familyB',
      targetLevelIdx: number,
      status: LevelAttemptStatus,
    ) => {
      setSavedDuels((prev) =>
        prev.map((d) => {
          if (d.id !== duelId) return d;
          const nextResults = [...d[side].levelResults];
          if (targetLevelIdx >= 0 && targetLevelIdx < nextResults.length) {
            nextResults[targetLevelIdx] = status;
          }
          return {
            ...d,
            [side]: {
              ...d[side],
              levelResults: nextResults,
            },
          };
        }),
      );
    },
    [],
  );

  const handleDeleteSavedDuel = useCallback((duelId: string) => {
    setSavedDuels((prev) => prev.filter((d) => d.id !== duelId));
  }, []);

  const handleClearAllSavedDuels = useCallback(() => {
    setSavedDuels([]);
  }, []);

  const handleConfirmReset = useCallback(() => {
    if (isSpinningRef.current) return;
    resetWheelForNextRun();
    setRewardPreview(null);
    setFamilies((prev) => [
      {
        id: 0,
        name: clearFamilyNamesOnReset ? '' : prev[0].name,
        outcome: 'pending',
        levelResults: createEmptyLevelResults(),
        mudrasReached: null,
        elapsedSec: null,
      },
      {
        id: 1,
        name: clearFamilyNamesOnReset ? '' : prev[1].name,
        outcome: 'pending',
        levelResults: createEmptyLevelResults(),
        mudrasReached: null,
        elapsedSec: null,
      },
    ]);
    setHasUnsavedDuelChanges(false);
    setClearFamilyNamesOnReset(false);
    setIsResetModalOpen(false);
  }, [resetWheelForNextRun, clearFamilyNamesOnReset]);

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
            {/* Traditional Indian Background Music Toggle */}
            <button
              type="button"
              onClick={handleToggleMusic}
              aria-pressed={isMusicPlaying}
              aria-label={
                isMusicPlaying
                  ? 'Couper la musique indienne'
                  : 'Lancer la musique indienne'
              }
              title={
                isMusicPlaying
                  ? 'Couper la musique indienne'
                  : 'Lancer la musique indienne'
              }
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 sm:px-3.5 py-2 text-sm font-bold shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0 ${
                isMusicPlaying
                  ? 'border-[#FDE68A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
                  : 'border-[#F5B324]/45 bg-[#5E0A12] text-[#FFF8EA] hover:bg-[#7A1019] hover:border-[#FCD34D]'
              }`}
            >
              <Music className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">
                {isMusicPlaying ? 'Musique active' : 'Musique indienne'}
              </span>
            </button>

            {/* Wheel Sound Effects Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              aria-pressed={!isMuted}
              aria-label={isMuted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
              title={isMuted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3 text-sm font-semibold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-[#F3D9A4]/60" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5 text-[#FCD34D]" aria-hidden="true" />
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3 sm:px-3.5 py-2 text-sm font-bold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              {isFullscreenActive ? (
                <Minimize2 className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isFullscreenActive ? 'Quitter le plein écran' : 'Plein écran'}
              </span>
            </button>

            {/* New Game Button */}
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              disabled={isWheelBusy}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#F5B324]/55 bg-[#7F1119] px-3 sm:px-3.5 py-2 text-sm font-bold text-[#FFF8EA] shadow-xs transition-colors hover:bg-[#9E1620] hover:border-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span className="hidden sm:inline">Nouvelle partie</span>
              <span className="sm:hidden">Rejouer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col gap-5 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-6 lg:px-8 lg:py-6">
        {/* TOP FULL-WIDTH DUEL BAR: 2 Families Playing Simultaneously for Golden Turtle Clues */}
        <div className="w-full lg:col-span-12">
          <FamilyDuelBar
            families={families}
            currentLevelIndex={levelIndex}
            currentLevelLabel={currentLevel.label}
            savedDuelsCount={savedDuels.length}
            saveFeedback={saveFeedback}
            onRenameFamily={handleRenameFamily}
            onSetFamilyLevelResult={handleSetFamilyLevelResult}
            onSetFamilyOutcome={handleSetFamilyOutcome}
            onPreviewOutcome={handlePreviewOutcome}
            onSaveDuel={handleSaveDuel}
            onStartNewDuel={handleStartNewDuel}
            onOpenHistory={() => setIsHistoryOpen(true)}
            rewardPreview={rewardPreview}
            onCloseRewardPreview={() => setRewardPreview(null)}
          />
        </div>

        {/* LEFT / CENTER HERO STAGE: Visual 1-Minute Level Countdown, Grand 3D Wheel & Primary Action */}
        <section
          aria-label="Roue des Mudras"
          className="flex flex-col items-center justify-center lg:col-span-7"
        >
          {/* 1-Minute Per-Level Visual Countdown + 8-Minute Duel Elapsed Tracker */}
          {isLevelTimerEnabled && (
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
              canRecordSpin={!hasReachedLevelTarget}
              isSpinning={isSpinning}
              onWheelClick={handleSpin}
              onManualSpinStart={handleManualSpinStart}
              onSpinInterrupt={handleSpinInterrupt}
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
              className={`inline-flex w-full min-h-[60px] items-center justify-center gap-2.5 rounded-2xl px-7 py-3.5 text-lg font-extrabold uppercase tracking-wider shadow-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/50 whitespace-nowrap ${
                canSpin
                  ? 'border-2 border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] text-white hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer shadow-black/35'
                  : 'border border-[#F5B324]/25 bg-[#4A090F]/70 text-[#F3D9A4]/50 cursor-not-allowed shadow-none'
              }`}
            >
              {duplicateNotice ? (
                <>
                  <RefreshCw className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                  <span>RELANCE AUTOMATIQUE…</span>
                </>
              ) : isSpinning ? (
                <>
                  <Disc3 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                  <span>LA ROUE TOURNE…</span>
                </>
              ) : isFinaleCompleted ? (
                <>
                  <Trophy className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span>FINALE TERMINÉE (7 MUDRAS)</span>
                </>
              ) : hasReachedLevelTarget ? (
                <>
                  <Check className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span>
                    {currentLevel.label.toUpperCase()} ATTEINT ({targetCount} MUDRAS)
                  </span>
                </>
              ) : (
                <>
                  <RotateCw className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>TOURNER LA ROUE</span>
                </>
              )}
            </button>

            {canAdvanceLevel && (
              <button
                type="button"
                onClick={handleAdvanceLevel}
                className="animate-lotus-reveal inline-flex w-full min-h-[58px] items-center justify-center gap-2.5 rounded-2xl border-2 border-[#FDE68A] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-3.5 text-base sm:text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/35 transition-all duration-150 hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FCD34D]/55"
              >
                <span>NIVEAU RÉUSSI : AJOUTER UN MUDRA</span>
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
            )}

            <p className="mt-0.5 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#F3D9A4]/80">
              <Hand className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Tournez, lancez ou arrêtez la roue directement au doigt</span>
            </p>
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
              <div className="flex items-center justify-center gap-2.5">
                <Trophy className="h-6 w-6 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                <p className="text-2xl sm:text-[1.65rem] font-extrabold tracking-tight text-[#FDE68A]">
                  Bravo, Maître des Mudras !
                </p>
                <LotusEmblem className="h-7 w-7 shrink-0" />
              </div>
              <p className="mt-1.5 text-sm sm:text-base text-[#FFF8EA]/85">
                Vous avez réussi les 6 étapes et réuni les 7 mudras de la Finale.
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

            {/* 1-Minute Per-Level Chrono Toggle & Duration Adjuster */}
            <div className="mt-4 border-t border-[#F5B324]/20 pt-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Timer className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span className="text-sm font-bold text-[#FFF8EA] truncate">
                    Chrono par niveau (1 min)
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
                  Lancez la roue au doigt ou appuyez sur « TOURNER LA ROUE » pour commencer.
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
                {isSequenceHidden ? (
                  <>
                    <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Afficher la séquence</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                    <span>Cacher la séquence</span>
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
                <span>Annuler le dernier tirage</span>
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
              La séquence actuelle, le niveau ({currentLevel.label}) ainsi que les
              images Tortue d’Or des deux familles seront réinitialisés au Niveau 1.
            </p>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#F5B324]/25 bg-[#240306]/70 px-3.5 py-2.5 text-sm font-semibold text-[#FFF8EA]">
              <input
                type="checkbox"
                checked={clearFamilyNamesOnReset}
                onChange={(e) => setClearFamilyNamesOnReset(e.target.checked)}
                className="h-4 w-4 accent-[#DC2626] cursor-pointer"
              />
              <span>Effacer aussi les noms des deux familles</span>
            </label>

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
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>OUI, NOUVELLE PARTIE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Matchup History Modal ("Carnet des duels · Qui contre Qui") */}
      <DuelHistoryModal
        open={isHistoryOpen}
        duels={savedDuels}
        onClose={() => setIsHistoryOpen(false)}
        onUpdateDuelOutcome={handleUpdateSavedDuelOutcome}
        onUpdateDuelLevelResult={handleUpdateSavedDuelLevelResult}
        onPreviewDuelSide={(familyName, outcome, mudrasReached, elapsedSec) => {
          setIsHistoryOpen(false);
          setRewardPreview({
            familyName,
            outcome,
            mudrasReached,
            elapsedSec,
          });
        }}
        onDeleteDuel={handleDeleteSavedDuel}
        onClearAllDuels={handleClearAllSavedDuels}
      />
    </div>
  );
}
