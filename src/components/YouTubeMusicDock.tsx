import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { mudraAudio } from '../game/audio';

export const DEFAULT_YT_PLAYLIST_ID = 'PLZ6fYBJLGXdM';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  unMute?: () => void;
  setVolume: (volume: number) => void;
  setLoop: (loopPlaylists: boolean) => void;
  getPlayerState?: () => number;
  getVideoData?: () => { title?: string; author?: string; video_id?: string };
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement | string,
    options: {
      host?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: (event: { data: number; target: YTPlayerInstance }) => void;
      };
    },
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeIframeAPI(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window unavailable'));
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') {
        prevCallback();
      }
      if (window.YT && typeof window.YT.Player === 'function') {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube IFrame API unavailable'));
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube IFrame API failed to load'));
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

interface InlineMusicPlayerProps {
  isFallbackSynthPlaying: boolean;
  onSetFallbackSynth: (playing: boolean) => void;
}

/**
 * Compact, zero-popup inline YouTube Music playlist player embedded directly in the header.
 * Provides instant (0ms) visual feedback & immediate audio start with seamless handoff
 * to the YouTube playlist the moment the stream begins playing.
 */
export function InlineMusicPlayer({
  isFallbackSynthPlaying,
  onSetFallbackSynth,
}: InlineMusicPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isYtPlaying, setIsYtPlaying] = useState(false);
  const [desiredPlaying, setDesiredPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [ytBlocked, setYtBlocked] = useState(false);

  const hostNodeRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const skipRetriesRef = useRef(0);
  const desiredPlayingRef = useRef(false);
  const hasPlayedYtOnceRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);
  const onSetFallbackSynthRef = useRef(onSetFallbackSynth);
  onSetFallbackSynthRef.current = onSetFallbackSynth;

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = hostNodeRef.current;
    if (!container || playerRef.current) return;

    let cancelled = false;

    void loadYouTubeIframeAPI()
      .then((YT) => {
        if (cancelled || !hostNodeRef.current || playerRef.current) return;

        const mountTarget = document.createElement('div');
        mountTarget.style.width = '100%';
        mountTarget.style.height = '100%';
        hostNodeRef.current.innerHTML = '';
        hostNodeRef.current.appendChild(mountTarget);

        const player = new YT.Player(mountTarget, {
          // Standard youtube.com host preserves the user's YouTube Premium browser session
          host: 'https://www.youtube.com',
          width: 220,
          height: 124,
          playerVars: {
            listType: 'playlist',
            list: DEFAULT_YT_PLAYLIST_ID,
            autoplay: 0,
            enablejsapi: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            loop: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              // Keep background playlist balanced so wheel ticks & Indian victory FX stay crisp on top
              event.target.setVolume(55);
              event.target.setLoop(true);
              setIsReady(true);
              if (desiredPlayingRef.current) {
                event.target.unMute?.();
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              const playing = state === 1;
              setIsYtPlaying(playing);

              if (playing) {
                hasPlayedYtOnceRef.current = true;
                skipRetriesRef.current = 0;
                clearFallbackTimer();
                setYtBlocked(false);
                // Seamless handoff: fade out local Indian ambiance the moment YouTube audio kicks in
                onSetFallbackSynthRef.current(false);
                const data = event.target.getVideoData?.();
                if (data?.title) {
                  setTrackTitle(data.title);
                }
              } else if (state === 2 && !desiredPlayingRef.current) {
                // Confirmed paused
                clearFallbackTimer();
              }
            },
            onError: (event) => {
              if (cancelled) return;
              const code = event.data;
              if ((code === 101 || code === 150) && skipRetriesRef.current < 4) {
                skipRetriesRef.current += 1;
                try {
                  event.target.nextVideo();
                  return;
                } catch {
                  // Fall through
                }
              }
              setIsYtPlaying(false);
              setYtBlocked(true);
              clearFallbackTimer();
              if (desiredPlayingRef.current) {
                onSetFallbackSynthRef.current(true);
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          setYtBlocked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearFallbackTimer]);

  useEffect(() => {
    return () => {
      clearFallbackTimer();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore teardown errors
        }
        playerRef.current = null;
      }
    };
  }, [clearFallbackTimer]);

  const isPlaying = desiredPlaying || isYtPlaying || isFallbackSynthPlaying;

  const handleTogglePlay = useCallback(() => {
    mudraAudio.unlock();

    // Instant PAUSE
    if (isPlaying) {
      clearFallbackTimer();
      desiredPlayingRef.current = false;
      setDesiredPlaying(false);
      setIsYtPlaying(false);
      onSetFallbackSynth(false);
      try {
        playerRef.current?.pauseVideo();
      } catch {
        // Ignore if iframe isn't ready
      }
      return;
    }

    // Instant PLAY: switch button color immediately (0ms)
    desiredPlayingRef.current = true;
    setDesiredPlaying(true);

    const player = playerRef.current;
    if (ytBlocked || !player || !isReady) {
      // Zero-latency audio start right away; YouTube will take over smoothly once ready if unblocked
      onSetFallbackSynth(true);
      return;
    }

    try {
      player.unMute?.();
      player.setVolume(55);
      player.playVideo();
    } catch {
      onSetFallbackSynth(true);
      return;
    }

    // If YouTube takes more than 350ms to buffer (or silently refuses autoplay on iPad),
    // kick in immediate local Indian music so there's never dead air; it cuts out automatically when YT plays!
    clearFallbackTimer();
    const waitMs = hasPlayedYtOnceRef.current ? 450 : 280;
    fallbackTimerRef.current = window.setTimeout(() => {
      fallbackTimerRef.current = null;
      if (!desiredPlayingRef.current) return;
      const ytState = playerRef.current?.getPlayerState?.();
      if (ytState !== 1) {
        onSetFallbackSynthRef.current(true);
      }
    }, waitMs);
  }, [clearFallbackTimer, isPlaying, isReady, onSetFallbackSynth, ytBlocked]);

  const handlePrevious = useCallback(() => {
    mudraAudio.unlock();
    const player = playerRef.current;
    if (!player || !isReady || ytBlocked) return;
    desiredPlayingRef.current = true;
    setDesiredPlaying(true);
    clearFallbackTimer();
    onSetFallbackSynth(false);
    player.unMute?.();
    player.previousVideo();
    player.playVideo();
  }, [clearFallbackTimer, isReady, onSetFallbackSynth, ytBlocked]);

  const handleNext = useCallback(() => {
    mudraAudio.unlock();
    const player = playerRef.current;
    if (!player || !isReady || ytBlocked) return;
    desiredPlayingRef.current = true;
    setDesiredPlaying(true);
    clearFallbackTimer();
    onSetFallbackSynth(false);
    player.unMute?.();
    player.nextVideo();
    player.playVideo();
  }, [clearFallbackTimer, isReady, onSetFallbackSynth, ytBlocked]);

  return (
    <>
      {/* Silent off-layer YouTube player mount (no popup, keeps audio alive across Home & Game) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 -z-10 h-[124px] w-[220px] overflow-hidden opacity-0"
      >
        <div ref={hostNodeRef} className="h-full w-full" />
      </div>

      {/* Compact Inline Header Music Control Strip */}
      <div
        role="region"
        aria-label="Lecteur de musique"
        title={
          trackTitle
            ? `En lecture : ${trackTitle}`
            : ytBlocked
              ? 'Ambiance indienne locale active'
              : 'Playlist YouTube Music'
        }
        className={`inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-1.5 py-1 shadow-xs transition-colors duration-75 shrink-0 ${
          isPlaying
            ? 'border-[#FCD34D] bg-[#4C070E]'
            : 'border-[#F5B324]/45 bg-[#5E0A12]'
        }`}
      >
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!isReady || ytBlocked}
          aria-label="Musique précédente"
          title="Musique précédente"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#7A1019] hover:text-[#FFF8EA] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          <SkipBack className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Mettre la musique en pause' : 'Lancer la musique'}
          title={isPlaying ? 'Pause' : 'Lire la musique'}
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-extrabold transition-colors duration-75 active:scale-[0.96] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap ${
            isPlaying
              ? 'border-[#FEF08A] bg-gradient-to-b from-[#F5B324] to-[#D97706] text-[#2B0508] hover:from-[#FCD34D] hover:to-[#EAB308]'
              : 'border-[#FCD34D]/60 bg-[#7F1119] text-[#FFF8EA] hover:bg-[#9E1620]'
          }`}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <Music className="h-3.5 w-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
          {trackTitle && isYtPlaying && (
            <span className="hidden 2xl:inline max-w-[120px] truncate font-bold">
              {trackTitle}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!isReady || ytBlocked}
          aria-label="Musique suivante"
          title="Musique suivante"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#7A1019] hover:text-[#FFF8EA] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          <SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
