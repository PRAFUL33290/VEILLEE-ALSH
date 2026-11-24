import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Hand,
  Maximize2,
  Pencil,
  Play,
  PlusCircle,
  Swords,
  Trash2,
  Users,
} from 'lucide-react';
import { LEVELS, MUDRAS } from '../game/mudras';
import { MudraSpriteAsset } from '../game/mudraSprites';
import { DuelFamilySlot, getDisplayFamilyName } from './FamilyDuelBar';
import accueilHeroImg from '../assets/images/accueil_defi_mudras_1795498540323.jpg';

interface HomeScreenProps {
  families: [DuelFamilySlot, DuelFamilySlot];
  onRenameFamily: (id: 0 | 1, name: string) => void;
  onClearFamily: (id: 0 | 1) => void;
  mudraSprites: Record<number, MudraSpriteAsset>;
  hasActiveGame: boolean;
  savedDuelsCount: number;
  onEnterGame: () => void;
  onStartNewFamilies: () => void;
  onOpenHistory: () => void;
}

export function HomeScreen({
  families,
  onRenameFamily,
  onClearFamily,
  mudraSprites,
  hasActiveGame,
  savedDuelsCount,
  onEnterGame,
  onStartNewFamilies,
  onOpenHistory,
}: HomeScreenProps) {
  const [heroImgBroken, setHeroImgBroken] = useState(false);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const inputRefs = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null]);
  const [lockedNames, setLockedNames] = useState<[boolean, boolean]>(() => [
    families[0].name.trim().length > 0,
    families[1].name.trim().length > 0,
  ]);

  useEffect(() => {
    setLockedNames((prev) => {
      const next0 = families[0].name.trim().length === 0 ? false : prev[0];
      const next1 = families[1].name.trim().length === 0 ? false : prev[1];
      if (next0 === prev[0] && next1 === prev[1]) return prev;
      return [next0, next1];
    });
  }, [families[0].name, families[1].name]);

  const handleConfirmFamilyName = (id: 0 | 1) => {
    const trimmed = families[id].name.trim();
    if (trimmed.length === 0) return;
    if (trimmed !== families[id].name) {
      onRenameFamily(id, trimmed);
    }
    setLockedNames((prev) => {
      const next: [boolean, boolean] = [prev[0], prev[1]];
      next[id] = true;
      return next;
    });
    inputRefs.current[id]?.blur();
  };

  const handleEditFamilyName = (id: 0 | 1) => {
    setLockedNames((prev) => {
      const next: [boolean, boolean] = [prev[0], prev[1]];
      next[id] = false;
      return next;
    });
    window.setTimeout(() => {
      inputRefs.current[id]?.focus();
    }, 0);
  };

  const handleDeleteFamily = (id: 0 | 1) => {
    setLockedNames((prev) => {
      const next: [boolean, boolean] = [prev[0], prev[1]];
      next[id] = false;
      return next;
    });
    onClearFamily(id);
  };

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
              <span>Duel de familles</span>
            </p>

            <h1 className="mt-2.5 text-4xl font-extrabold tracking-tight text-[#FFF8EA] drop-shadow-[0_4px_24px_rgba(20,0,4,0.9)] sm:text-5xl lg:text-6xl">
              Le défi des mudras
            </h1>

            <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium text-[#F3D9A4]/90">
              Découvrez les {MUDRAS.length} mudras ci-dessous avant de lancer la roue et de relever
              l’enchaînement en famille.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveGame ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onStartNewFamilies();
                      window.setTimeout(() => {
                        inputRefs.current[0]?.focus();
                      }, 40);
                    }}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#DC2626] via-[#B91C1C] to-[#88131B] px-7 py-3 text-base sm:text-lg font-extrabold uppercase tracking-wider text-white shadow-xl shadow-black/45 transition-all hover:from-[#EF2D2D] hover:to-[#991B1B] active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                  >
                    <Users className="h-5 w-5 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                    <span>Nouvelles familles</span>
                  </button>

                  <button
                    type="button"
                    onClick={onEnterGame}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border border-[#FCD34D]/80 bg-[#3B050A]/90 px-6 py-3 text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA] shadow-lg shadow-black/35 backdrop-blur-xs transition-colors hover:bg-[#5E0A12] hover:border-[#FEF08A] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                  >
                    <Play className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                    <span>Reprendre la partie</span>
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

              {savedDuelsCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-[#F5B324]/55 bg-[#2B0408]/85 px-5 py-3 text-sm sm:text-base font-bold text-[#FDE68A] backdrop-blur-xs transition-colors hover:bg-[#48070D] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  <ClipboardList className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
                  <span>Carnet des duels ({savedDuelsCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Family Names Registration Section (Entered on HomeScreen before entering the Wheel) */}
      <section
        aria-labelledby="home-families-heading"
        className="rounded-2xl border border-[#F5B324]/45 bg-[#3B050A]/90 p-5 shadow-lg shadow-black/30 backdrop-blur-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2
              id="home-families-heading"
              className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FFF8EA]"
            >
              Les familles du duel
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[#F3D9A4]/80">
              Renseignez le nom des deux familles avant de lancer la partie
            </p>
          </div>

          {hasActiveGame && (
            <button
              type="button"
              onClick={() => {
                onStartNewFamilies();
                window.setTimeout(() => {
                  inputRefs.current[0]?.focus();
                }, 40);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D]/75 bg-[#7F1119] px-4 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#FFF8EA] transition-colors hover:bg-[#9E1620] hover:border-[#FEF08A] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
            >
              <PlusCircle className="h-4 w-4 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <span>Enregistrer &amp; nouvelles familles</span>
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          {families.map((team, idx) => {
            const displayName = getDisplayFamilyName(team.name, team.id);
            const hasTypedName = team.name.trim().length > 0;
            const isNameSaved = lockedNames[team.id] && hasTypedName;

            const familyField = (
              <div
                key={team.id}
                className="flex flex-col gap-2 rounded-xl border border-[#F5B324]/30 bg-[#260306]/80 p-3.5"
              >
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#FCD34D]">
                  <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Famille n°{team.id + 1}</span>
                </div>

                {isNameSaved ? (
                  <div className="flex min-h-[46px] items-center justify-between gap-2 rounded-xl border border-[#F5B324]/35 bg-[#1E0205]/75 px-3.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Check
                        className="h-4 w-4 shrink-0 text-[#6EE7B7]"
                        aria-hidden="true"
                      />
                      <span className="truncate text-base font-extrabold uppercase tracking-wide text-[#FFF8EA]">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditFamilyName(team.id)}
                        aria-label={`Modifier le nom de ${displayName}`}
                        title="Modifier le nom"
                        className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#F5B324]/35 bg-[#3B050A] px-2.5 py-1 text-xs font-bold text-[#FCD34D] transition-colors hover:border-[#FCD34D] hover:bg-[#5E0A12] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFamily(team.id)}
                        aria-label={`Supprimer ${displayName}`}
                        title="Supprimer cette famille"
                        className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#FCA5A5]/45 bg-[#5C0810] px-2.5 py-1 text-xs font-bold text-[#FECACA] transition-colors hover:border-[#FCA5A5] hover:bg-[#7F1D1D] hover:text-white cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    autoComplete="off"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleConfirmFamilyName(team.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <label htmlFor={`home-family-name-${team.id}`} className="sr-only">
                      Nom de la famille n°{team.id + 1}
                    </label>
                    <input
                      ref={(el) => {
                        inputRefs.current[team.id] = el;
                      }}
                      id={`home-family-name-${team.id}`}
                      name={`mudra-slot-${team.id}`}
                      type="text"
                      value={team.name}
                      maxLength={32}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(e) => onRenameFamily(team.id, e.target.value)}
                      placeholder=""
                      className="min-h-[46px] min-w-0 flex-1 rounded-xl border border-[#F5B324]/40 bg-[#1E0205] px-3.5 py-2 text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA] transition-colors focus:border-[#FCD34D] focus:bg-[#2E0408] focus:outline-none focus:ring-2 focus:ring-[#FCD34D]/50"
                    />
                    {hasTypedName && (
                      <>
                        <button
                          type="submit"
                          className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#FCD34D]/85 bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-4 py-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition-all hover:from-[#EF2D2D] hover:to-[#B91C1C] active:scale-[0.985] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                        >
                          <Check className="h-4 w-4 shrink-0 text-[#FEF08A]" aria-hidden="true" />
                          <span>ENREGISTRER</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFamily(team.id)}
                          aria-label={`Supprimer la famille n°${team.id + 1}`}
                          title="Supprimer cette famille"
                          className="inline-flex min-h-[46px] min-w-[46px] shrink-0 items-center justify-center rounded-xl border border-[#FCA5A5]/45 bg-[#5C0810] text-[#FECACA] transition-colors hover:border-[#FCA5A5] hover:bg-[#7F1D1D] hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </form>
                )}
              </div>
            );

            if (idx === 0) {
              return (
                <div key="home-family-0-wrapper" className="contents">
                  {familyField}
                  <div className="flex items-center justify-center gap-2 py-1 md:flex-col md:px-1">
                    <div className="h-px flex-1 bg-[#F5B324]/25 md:hidden" aria-hidden="true" />
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#FCD34D]">
                      <Swords className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>CONTRE</span>
                    </span>
                    <div className="h-px flex-1 bg-[#F5B324]/25 md:hidden" aria-hidden="true" />
                  </div>
                </div>
              );
            }

            return familyField;
          })}
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
              title: 'Deux familles face à face',
              detail:
                'Les deux familles jouent en même temps, côte à côte, sur le même enchaînement de gestes.',
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
                'La roue tire au sort les gestes (sans doublon) qui composent la séquence dans un ordre précis.',
            },
            {
              step: '04',
              title: '1 minute par niveau',
              detail:
                'Du Niveau 1 (2 mudras) jusqu’à la Finale (7 mudras), vous avez 1 minute par niveau pour mémoriser et reproduire les gestes.',
            },
            {
              step: '05',
              title: 'Validation par équipe',
              detail:
                'À la fin de chaque niveau, l’animateur valide si chaque famille a réussi ou raté l’enchaînement.',
            },
            {
              step: '06',
              title: 'Récompense : la Tortue d’Or',
              detail:
                'Les 7 mudras réussis dans le temps imparti donnent l’image entière ; sinon, la famille repart avec la moitié de l’image (½).',
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

      {/* Complete Showcase Grid of All 12 Mudras */}
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

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {MUDRAS.map((mudra, idx) => {
            const sprite = mudraSprites[mudra.id];
            const indexLabel = String(idx + 1).padStart(2, '0');

            return (
              <button
                key={mudra.id}
                type="button"
                onClick={() => setZoomedIndex(idx)}
                aria-label={`Afficher le mudra ${mudra.name.toUpperCase()} en plein écran`}
                className="group flex flex-col items-center rounded-2xl border border-[#F5B324]/35 bg-[#3B050A]/88 p-3.5 text-center shadow-md shadow-black/25 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#FCD34D] hover:bg-[#52080F] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
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
