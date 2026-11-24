import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

export const DEFAULT_YT_PLAYLIST_ID = 'PLZ6fYBJLGXdM';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  setVolume: (volume: number) => void;
  setLoop: (loopPlaylists: boolean) => void;
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
 * Keeps the YouTube IFrame mounted silently off-layer so playback stays uninterrupted
 * across HomeScreen and GameScreen with simple Previous / Play-Pause / Next controls.
 */
export function InlineMusicPlayer({
  isFallbackSynthPlaying,
  onSetFallbackSynth,
}: InlineMusicPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isYtPlaying, setIsYtPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [ytBlocked, setYtBlocked] = useState(false);

  const hostNodeRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const skipRetriesRef = useRef(0);
  const pendingPlayRef = useRef(false);
  const onSetFallbackSynthRef = useRef(onSetFallbackSynth);
  onSetFallbackSynthRef.current = onSetFallbackSynth;

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
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            loop: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              event.target.setVolume(80);
              event.target.setLoop(true);
              setIsReady(true);
              if (pendingPlayRef.current) {
                pendingPlayRef.current = false;
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const playing = event.data === 1;
              setIsYtPlaying(playing);
              if (playing) {
                skipRetriesRef.current = 0;
                setYtBlocked(false);
                onSetFallbackSynthRef.current(false);
                const data = event.target.getVideoData?.();
                if (data?.title) {
                  setTrackTitle(data.title);
                }
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
              // Seamlessly activate offline Indian ambiance if user pressed play and YouTube refused embed
              if (pendingPlayRef.current) {
                pendingPlayRef.current = false;
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
  }, []);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore teardown errors
        }
        playerRef.current = null;
      }
    };
  }, []);

  const isPlaying = isYtPlaying || isFallbackSynthPlaying;

  const handleTogglePlay = useCallback(() => {
    if (isFallbackSynthPlaying) {
      onSetFallbackSynth(false);
      return;
    }

    if (ytBlocked) {
      onSetFallbackSynth(true);
      return;
    }

    const player = playerRef.current;
    if (!player || !isReady) {
      pendingPlayRef.current = true;
      return;
    }

    if (isYtPlaying) {
      player.pauseVideo();
    } else {
      pendingPlayRef.current = true;
      player.playVideo();
    }
  }, [isFallbackSynthPlaying, isReady, isYtPlaying, onSetFallbackSynth, ytBlocked]);

  const handlePrevious = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady || ytBlocked) return;
    onSetFallbackSynth(false);
    player.previousVideo();
  }, [isReady, onSetFallbackSynth, ytBlocked]);

  const handleNext = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady || ytBlocked) return;
    onSetFallbackSynth(false);
    player.nextVideo();
  }, [isReady, onSetFallbackSynth, ytBlocked]);

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
              ? 'Playlist YouTube privée ou bloquée · ambiance indienne locale active'
              : 'Playlist YouTube Music'
        }
        className={`inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-1.5 py-1 shadow-xs transition-colors shrink-0 ${
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#7A1019] hover:text-[#FFF8EA] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          <SkipBack className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Mettre la musique en pause' : 'Lancer la musique'}
          title={isPlaying ? 'Pause' : 'Lire la playlist YouTube Music'}
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap ${
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#FCD34D] transition-colors hover:bg-[#7A1019] hover:text-[#FFF8EA] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          <SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
