import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Hand,
  Maximize2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { LEVELS, MUDRAS } from '../game/mudras';
import { MudraSpriteAsset } from '../game/mudraSprites';
import accueilHeroImg from '../assets/images/accueil_defi_mudras_1795498540323.jpg';

interface HomeScreenProps {
  mudraSprites: Record<number, MudraSpriteAsset>;
  hasActiveGame: boolean;
  onEnterGame: () => void;
  onResetGame: () => void;
}

export function HomeScreen({
  mudraSprites,
  hasActiveGame,
  onEnterGame,
  onResetGame,
}: HomeScreenProps) {
  const [heroImgBroken, setHeroImgBroken] = useState(false);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (zoomedIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setZoomedIndex(null);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setZoomedIndex((prev) =>
          prev === null ? null : (prev - 1 + MUDRAS.length) % MUDRAS.length,
        );
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setZoomedIndex((prev) => (prev === null ? null : (prev + 1) % MUDRAS.length));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [zoomedIndex]);

  const zoomedMudra = zoomedIndex !== null ? MUDRAS[zoomedIndex] : null;
  const zoomedSprite = zoomedMudra ? mudraSprites[zoomedMudra.id] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-7 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      {/* Cinematic Welcome Hero Banner */}
      <section
        aria-label="Accueil des joueurs — Le défi des mudras"
        className="relative overflow-hidden rounded-3xl border-2 border-[#F5B324]/70 bg-[#2A0307] shadow-2xl shadow-black/50"
      >
        <div className="relative flex min-h-[340px] w-full flex-col justify-end sm:min-h-[420px] lg:min-h-[460px]">
          {/* Bespoke Royal Palace Stage Artwork with Resilient Fallback */}
          {!heroImgBroken ? (
            <img
              src={accueilHeroImg}
              alt="Décor royal indien du jeu Le défi des mudras"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgBroken(true)}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 35%, rgba(245, 179, 36, 0.35) 0%, rgba(168, 20, 28, 0.9) 48%, #260306 100%)',
              }}
            />
          )}

          {/* Measured Contrast Scrim for Crisp Typography Legibility */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#220205] via-[#220205]/62 to-[#220205]/18"
          />

          {/* Centered Editorial Title & Primary CTA */}
          <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-8 pt-24 text-center sm:px-10 sm:pb-10 sm:pt-32">
            <div className="mb-3 h-0.5 w-20 rounded-full bg-gradient-to-r from-transparent via-[#FCD34D] to-transparent" />

            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#FDE68A]">
              <span>{MUDRAS.length} gestes sacrés</span>
              <span className="mx-2 text-[#F5B324]/60" aria-hidden="true">
                ·
              </span>
              <span>{LEVELS.length} niveaux</span>
              <span className="mx-2 text-[#F5B324]/60" aria-hidden="true">
                ·
              </span>
              <span>Team 1 vs Team 2</span>
            </p>

            <h1 className="mt-2.5 text-4xl font-extrabold tracking-tight text-[#FFF8EA] drop-shadow-[0_4px_24px_rgba(20,0,4,0.9)] sm:text-5xl lg:text-6xl">
              Le défi des mudras
            </h1>

            <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium text-[#F3D9A4]/90">
              Découvrez les {MUDRAS.length} mudras ci-dessous avant de lancer la roue et de relever
              le défi entre Team 1 et Team 2.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveGame ? (
                <>
                  <button
                    type="button"
                    onClick={onEnterGame}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#DC2626] via-[#B91C1C] to-[#88131B] px-7 py-3 text-base sm:text-lg font-extrabold uppercase tracking-wider text-white shadow-xl shadow-black/45 transition-all hover:from-[#EF2D2D] hover:to-[#991B1B] active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                  >
                    <Play className="h-5 w-5 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                    <span>Reprendre la partie</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetGame}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border border-[#FCD34D]/80 bg-[#3B050A]/90 px-6 py-3 text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA] shadow-lg shadow-black/35 backdrop-blur-xs transition-colors hover:bg-[#5E0A12] hover:border-[#FEF08A] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                  >
                    <RotateCcw className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                    <span>Nouvelle partie</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onEnterGame}
                  className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#DC2626] via-[#B91C1C] to-[#88131B] px-8 py-3.5 text-base sm:text-lg font-extrabold uppercase tracking-wider text-white shadow-xl shadow-black/45 transition-all hover:from-[#EF2D2D] hover:to-[#991B1B] active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  <Play className="h-5 w-5 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                  <span>Commencer la partie</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ordered Game Rules Section (Chronological Briefing for the 2-Minute Explanation) */}
      <section aria-labelledby="game-rules-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2
            id="game-rules-heading"
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FFF8EA]"
          >
            Les règles du jeu
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#F3D9A4]/80 tabular-nums">
            2 min d’explication · 6 min de jeu · 8 min maximum
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Team 1 contre Team 2',
              detail:
                'Les deux équipes jouent en même temps, côte à côte, sur le même enchaînement de gestes.',
            },
            {
              step: '02',
              title: '8 minutes chrono au total',
              detail:
                `2 minutes pour découvrir les règles et les ${MUDRAS.length} mudras, puis 6 minutes de jeu pour réussir le défi.`,
            },
            {
              step: '03',
              title: 'Lancer la roue des mudras',
              detail:
                'La roue tire au sort les gestes qui composent la séquence dans un ordre précis (si un mudra sort en double, il compte aussi).',
            },
            {
              step: '04',
              title: '7 niveaux jusqu’aux 11 mudras',
              detail:
                'Du Niveau 1 (2 mudras) jusqu’au Niveau 7 / Finale (11 mudras), les enchaînements progressent sur 7 niveaux (2, 4, 6, 8, 9, 10 puis 11 mudras).',
            },
            {
              step: '05',
              title: 'Validation par équipe',
              detail:
                'À la fin de chaque niveau, l’animateur valide si Team 1 et Team 2 ont réussi ou raté l’enchaînement.',
            },
            {
              step: '06',
              title: 'Récompense : la Tortue d’Or',
              detail:
                'Arriver au Niveau 4 donne la moitié de l’image (½) ; arriver au Niveau 7 à la fin donne l’entièreté de l’image !',
            },
          ].map((rule) => (
            <li
              key={rule.step}
              className="flex flex-col rounded-2xl border border-[#F5B324]/30 bg-[#3B050A]/85 p-4 sm:p-5 shadow-md shadow-black/20"
            >
              <div className="flex items-baseline gap-2.5">
                <span className="text-lg font-extrabold text-[#FCD34D] tabular-nums">
                  {rule.step}.
                </span>
                <h3 className="text-base font-extrabold text-[#FFF8EA]">
                  {rule.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#F3D9A4]/88">
                {rule.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Complete Showcase Grid of All Mudras */}
      <section aria-labelledby="all-mudras-heading" className="flex flex-col gap-4 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2
            id="all-mudras-heading"
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FFF8EA]"
          >
            Les {MUDRAS.length} mudras
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#F3D9A4]/80">
            Touchez un mudra pour l’afficher en plein écran
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3.5 sm:gap-4">
          {MUDRAS.map((mudra, idx) => {
            const sprite = mudraSprites[mudra.id];
            const indexLabel = String(idx + 1).padStart(2, '0');

            return (
              <button
                key={mudra.id}
                type="button"
                onClick={() => setZoomedIndex(idx)}
                aria-label={`Afficher le mudra ${mudra.name.toUpperCase()} en plein écran`}
                className="group flex w-[calc(50%-0.45rem)] sm:w-[calc(33.333%-0.7rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(16.666%-0.85rem)] flex-col items-center rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-3.5 text-center shadow-md shadow-black/25 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#FCD34D] hover:bg-[#52080F] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                <div className="mb-2 flex w-full items-center justify-between text-xs font-extrabold tabular-nums">
                  <span className="text-[#FCD34D]/85">{indexLabel}</span>
                  <Maximize2
                    className="h-3.5 w-3.5 text-[#F3D9A4]/55 transition-colors group-hover:text-[#FCD34D]"
                    aria-hidden="true"
                  />
                </div>

                <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-[#F5B324]/75 bg-[#FFF8EA] p-3 shadow-inner transition-transform duration-150 group-hover:scale-[1.03] group-hover:border-[#FCD34D]">
                  {sprite ? (
                    <img
                      src={sprite.dataUrl}
                      alt={`Geste ${mudra.name.toUpperCase()}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Hand className="h-14 w-14 text-[#991B1B]/75" aria-hidden="true" />
                  )}
                </div>

                <span className="mt-3 w-full truncate text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA]">
                  {mudra.name.toUpperCase()}
                </span>

                <span className="mt-0.5 w-full truncate text-xs sm:text-sm font-semibold text-[#FDE68A]/90">
                  {mudra.meaningFr}
                </span>

                <span
                  className="mt-2 h-1 w-10 rounded-full"
                  style={{ backgroundColor: mudra.colorHex }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Fullscreen Mudra Zoom Overlay from Welcome Screen */}
      {zoomedMudra && zoomedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#2B0408]/98 px-4 py-4 sm:px-8 sm:py-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-zoomed-mudra-title"
        >
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setZoomedIndex(null)}
              className="inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-xl border-2 border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/40 transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Retour</span>
            </button>

            <div className="text-right tabular-nums">
              <p className="text-sm sm:text-base font-extrabold text-[#FCD34D]">
                Mudra {zoomedIndex + 1} / {MUDRAS.length}
              </p>
              <p className="text-xs font-semibold text-[#F3D9A4]/75">
                Le défi des mudras
              </p>
            </div>
          </div>

          <div className="mx-auto my-4 flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 sm:gap-7 min-h-0">
            <div className="animate-lotus-reveal flex aspect-square max-h-[56vh] w-full max-w-[min(82vw,520px)] items-center justify-center rounded-3xl border-4 border-[#F5B324] bg-[#FFF8EA] p-6 sm:p-10 shadow-2xl shadow-black/50">
              {zoomedSprite ? (
                <img
                  src={zoomedSprite.dataUrl}
                  alt={`Geste ${zoomedMudra.name.toUpperCase()}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Hand className="h-32 w-32 text-[#991B1B]" aria-hidden="true" />
              )}
            </div>

            <div className="flex flex-col items-center text-center">
              <h2
                id="home-zoomed-mudra-title"
                className="text-3xl sm:text-5xl font-extrabold uppercase tracking-wider text-[#FFF8EA]"
              >
                {zoomedMudra.name.toUpperCase()}
              </h2>
              <p className="mt-1.5 text-lg sm:text-2xl font-bold text-[#FDE68A]">
                {zoomedMudra.meaningFr}
              </p>
              <span
                className="mt-3 h-1.5 w-24 rounded-full"
                style={{ backgroundColor: zoomedMudra.colorHex }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                setZoomedIndex((zoomedIndex - 1 + MUDRAS.length) % MUDRAS.length)
              }
              aria-label="Mudra précédent"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/50 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
            >
              <ChevronLeft className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            <button
              type="button"
              onClick={() => setZoomedIndex(null)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/80 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-6 py-2.5 text-sm sm:text-base font-extrabold uppercase tracking-wide text-white shadow-md transition-colors hover:from-[#EF2D2D] hover:to-[#B91C1C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Retour à l’accueil</span>
            </button>

            <button
              type="button"
              onClick={() => setZoomedIndex((zoomedIndex + 1) % MUDRAS.length)}
              aria-label="Mudra suivant"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/50 bg-[#5E0A12] px-4 py-2.5 text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] whitespace-nowrap"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
