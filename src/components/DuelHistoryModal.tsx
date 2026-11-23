import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Copy,
  Eye,
  Image as ImageIcon,
  Minus,
  Search,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import { LEVELS } from '../game/mudras';
import {
  FamilyOutcome,
  LEVEL_SHORT_CODES,
  LevelAttemptStatus,
  SavedDuelRecord,
  TortueClueVisual,
  countPassedLevels,
  getNextCycledLevelStatus,
  getOutcomeLabel,
} from './FamilyDuelBar';
import { formatElapsedTime } from './CountdownBanner';

interface DuelHistoryModalProps {
  open: boolean;
  duels: SavedDuelRecord[];
  onClose: () => void;
  onUpdateDuelOutcome: (
    duelId: string,
    side: 'familyA' | 'familyB',
    outcome: FamilyOutcome,
  ) => void;
  onUpdateDuelLevelResult: (
    duelId: string,
    side: 'familyA' | 'familyB',
    levelIdx: number,
    status: LevelAttemptStatus,
  ) => void;
  onPreviewDuelSide: (
    familyName: string,
    outcome: 'complete' | 'partial',
    mudrasReached: number | null,
    elapsedSec: number | null,
  ) => void;
  onDeleteDuel: (duelId: string) => void;
  onClearAllDuels: () => void;
}

function formatRecordedTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function DuelHistoryModal({
  open,
  duels,
  onClose,
  onUpdateDuelOutcome,
  onUpdateDuelLevelResult,
  onPreviewDuelSide,
  onDeleteDuel,
  onClearAllDuels,
}: DuelHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmClearAll(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filteredDuels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return duels;
    return duels.filter(
      (d) =>
        d.familyA.name.toLowerCase().includes(q) ||
        d.familyB.name.toLowerCase().includes(q) ||
        `duel ${d.duelNumber}`.includes(q),
    );
  }, [duels, searchQuery]);

  const stats = useMemo(() => {
    let completeCount = 0;
    let partialCount = 0;
    duels.forEach((d) => {
      if (d.familyA.outcome === 'complete') completeCount += 1;
      else if (d.familyA.outcome === 'partial') partialCount += 1;
      if (d.familyB.outcome === 'complete') completeCount += 1;
      else if (d.familyB.outcome === 'partial') partialCount += 1;
    });
    return { completeCount, partialCount };
  }, [duels]);

  if (!open) return null;

  const handleCopySummary = async () => {
    const lines = duels.map((d) => {
      const time = formatRecordedTime(d.recordedAtIso);
      const aPassed = countPassedLevels(d.familyA.levelResults);
      const bPassed = countPassedLevels(d.familyB.levelResults);
      return `Duel #${d.duelNumber} (${time}) : ${d.familyA.name} (${aPassed}/${LEVELS.length} niv. · ${getOutcomeLabel(
        d.familyA.outcome,
      )}) CONTRE ${d.familyB.name} (${bPassed}/${LEVELS.length} niv. · ${getOutcomeLabel(
        d.familyB.outcome,
      )})`;
    });
    const text = `Carnet des duels - Le défi des Mudras (Tortue d'Or)\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(true);
      window.setTimeout(() => setCopiedFeedback(false), 2200);
    } catch {
      // Ignore clipboard permission errors in sandboxed iframes
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0204]/80 p-3 sm:p-5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duel-history-title"
      onClick={onClose}
    >
      <div
        className="animate-lotus-reveal flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border-2 border-[#F5B324]/70 bg-[#3B050A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#F5B324]/25 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 shrink-0 text-[#FCD34D]" aria-hidden="true" />
              <h2
                id="duel-history-title"
                className="text-xl font-extrabold text-[#FFF8EA]"
              >
                Carnet des duels · Tortue d’Or
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#F3D9A4]/85 tabular-nums">
              <span>
                {duels.length} {duels.length > 1 ? 'duels enregistrés' : 'duel enregistré'}
              </span>
              <span className="mx-1.5 text-[#F5B324]/45" aria-hidden="true">
                ·
              </span>
              <span className="text-[#FDE68A]">
                {stats.completeCount} {stats.completeCount > 1 ? 'images entières' : 'image entière'}
              </span>
              <span className="mx-1.5 text-[#F5B324]/45" aria-hidden="true">
                ·
              </span>
              <span>
                {stats.partialCount} {stats.partialCount > 1 ? 'moitiés d’image' : 'moitié d’image'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le carnet des duels"
            className="inline-flex min-h-[42px] min-w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#F5B324]/40 bg-[#5E0A12] text-[#F3D9A4] transition-colors hover:bg-[#7A1019] hover:text-[#FFF8EA] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search & Utility Bar */}
        {duels.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#F5B324]/20 bg-[#2C0408]/60 px-5 py-3 sm:px-6">
            <div className="relative flex min-w-[200px] flex-1 items-center">
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4 text-[#F5B324]/70"
                aria-hidden="true"
              />
              <label htmlFor="duel-history-search" className="sr-only">
                Rechercher une famille
              </label>
              <input
                id="duel-history-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une famille…"
                className="min-h-[42px] w-full rounded-xl border border-[#F5B324]/35 bg-[#240306] py-1.5 pl-9 pr-3 text-sm font-semibold text-[#FFF8EA] placeholder:text-[#F3D9A4]/45 focus:border-[#FCD34D] focus:outline-none focus:ring-2 focus:ring-[#FCD34D]/50"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/45 bg-[#5E0A12] px-3.5 py-2 text-xs sm:text-sm font-bold text-[#FFF8EA] transition-colors hover:bg-[#7A1019] hover:border-[#FCD34D] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
              >
                {copiedFeedback ? (
                  <>
                    <Check className="h-4 w-4 text-[#FCD34D]" aria-hidden="true" />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[#FCD34D]" aria-hidden="true" />
                    <span>Copier le bilan</span>
                  </>
                )}
              </button>

              {confirmClearAll ? (
                <button
                  type="button"
                  onClick={() => {
                    onClearAllDuels();
                    setConfirmClearAll(false);
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#FCA5A5] bg-[#B91C1C] px-3.5 py-2 text-xs sm:text-sm font-extrabold uppercase text-white transition-colors hover:bg-[#DC2626] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  Confirmer la suppression
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#F5B324]/35 bg-[#240306] px-3 py-2 text-xs font-bold text-[#F3D9A4]/85 transition-colors hover:bg-[#5E0A12] hover:text-[#FFF8EA] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                >
                  <Trash2 className="h-3.5 w-3.5 text-[#F87171]" aria-hidden="true" />
                  <span>Tout effacer</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recorded Duels List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {duels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#F5B324]/35 bg-[#240306]/65 px-5 py-10 text-center">
              <Swords className="mx-auto h-8 w-8 text-[#F5B324]/60" aria-hidden="true" />
              <p className="mt-3 text-base font-bold text-[#FFF8EA]">
                Aucun duel enregistré pour le moment
              </p>
              <p className="mt-1 text-sm text-[#F3D9A4]/75">
                Saisissez le nom des deux familles en haut de l’écran, validez leurs défis par
                niveau et leur récompense, puis cliquez sur « Enregistrer le duel ».
              </p>
            </div>
          ) : filteredDuels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#F5B324]/30 bg-[#240306]/60 px-5 py-8 text-center text-sm font-semibold text-[#F3D9A4]/80">
              Aucune famille ne correspond à « {searchQuery} ».
            </div>
          ) : (
            <ol className="flex flex-col gap-3.5">
              {filteredDuels.map((duel) => {
                const timeLabel = formatRecordedTime(duel.recordedAtIso);

                return (
                  <li
                    key={duel.id}
                    className="rounded-2xl border border-[#F5B324]/35 bg-[#260306]/90 p-4"
                  >
                    {/* Duel Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-[#F5B324]/18 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#F3D9A4]/85 tabular-nums">
                        <span className="text-[#FCD34D] font-extrabold">
                          Duel #{duel.duelNumber}
                        </span>
                        {timeLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{timeLabel}</span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteDuel(duel.id)}
                        aria-label={`Supprimer le duel #${duel.duelNumber}`}
                        title="Supprimer ce duel"
                        className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[#F5B324]/25 bg-[#3B050A] text-[#F3D9A4]/75 transition-colors hover:border-[#F87171] hover:text-[#FCA5A5] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Family A CONTRE Family B */}
                    <div className="mt-3 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                      {(['familyA', 'familyB'] as const).map((side, idx) => {
                        const entry = duel[side];
                        const passedCount = countPassedLevels(entry.levelResults);

                        const sideBlock = (
                          <div
                            key={side}
                            className="flex flex-col gap-2.5 rounded-xl border border-[#F5B324]/22 bg-[#3B050A]/80 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-[#FFF8EA] truncate">
                                  {entry.name}
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-[#FDE68A]">
                                  {getOutcomeLabel(entry.outcome)}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold text-[#F3D9A4]/80 tabular-nums">
                                  <span>
                                    {passedCount}/{LEVELS.length} niveaux réussis
                                  </span>
                                  {entry.elapsedSec !== null && (
                                    <>
                                      <span className="mx-1 text-[#F5B324]/50" aria-hidden="true">
                                        ·
                                      </span>
                                      <span>{formatElapsedTime(entry.elapsedSec)}</span>
                                    </>
                                  )}
                                </p>
                              </div>

                              {entry.outcome !== 'pending' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewDuelSide(
                                      entry.name,
                                      entry.outcome as 'complete' | 'partial',
                                      entry.mudrasReached,
                                      entry.elapsedSec,
                                    )
                                  }
                                  title="Afficher en grand"
                                  aria-label={`Afficher l'indice de ${entry.name}`}
                                  className="group relative shrink-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
                                >
                                  <TortueClueVisual
                                    kind={entry.outcome}
                                    size="thumb"
                                    imgBroken={imgBroken}
                                    onImgError={() => setImgBroken(true)}
                                  />
                                  <span className="sr-only">Afficher</span>
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <Eye className="h-4 w-4 text-[#FEF08A]" />
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Per-Level Breakdown Strip (editable inline) */}
                            <div
                              className="grid grid-cols-6 gap-1"
                              role="group"
                              aria-label={`Résultats par niveau de ${entry.name}`}
                            >
                              {LEVELS.map((lvl) => {
                                const status = entry.levelResults[lvl.index] ?? 'pending';
                                const shortCode =
                                  LEVEL_SHORT_CODES[lvl.index] ?? `N${lvl.index + 1}`;
                                return (
                                  <button
                                    key={lvl.index}
                                    type="button"
                                    onClick={() =>
                                      onUpdateDuelLevelResult(
                                        duel.id,
                                        side,
                                        lvl.index,
                                        getNextCycledLevelStatus(status),
                                      )
                                    }
                                    title={`${entry.name} · ${lvl.label} (cliquer pour corriger)`}
                                    className={`flex min-h-[34px] flex-col items-center justify-center rounded-md border px-0.5 py-0.5 transition-colors cursor-pointer ${
                                      status === 'passed'
                                        ? 'border-[#6EE7B7]/70 bg-[#065F46]/75 text-[#ECFDF5]'
                                        : status === 'failed'
                                          ? 'border-[#FCA5A5]/65 bg-[#7F1D1D]/80 text-[#FEE2E2]'
                                          : 'border-[#F5B324]/20 bg-[#240306]/75 text-[#F3D9A4]/55 hover:border-[#F5B324]/50'
                                    }`}
                                  >
                                    <span className="text-[9px] font-extrabold leading-none tabular-nums">
                                      {shortCode}
                                    </span>
                                    <span className="mt-0.5 flex items-center justify-center">
                                      {status === 'passed' ? (
                                        <Check
                                          className="h-3 w-3 text-[#6EE7B7]"
                                          aria-hidden="true"
                                        />
                                      ) : status === 'failed' ? (
                                        <X className="h-3 w-3 text-[#FCA5A5]" aria-hidden="true" />
                                      ) : (
                                        <Minus className="h-2.5 w-2.5 opacity-45" aria-hidden="true" />
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Quick inline reward toggles */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateDuelOutcome(
                                    duel.id,
                                    side,
                                    entry.outcome === 'complete' ? 'pending' : 'complete',
                                  )
                                }
                                className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold uppercase transition-colors cursor-pointer whitespace-nowrap ${
                                  entry.outcome === 'complete'
                                    ? 'border-[#FEF08A] bg-[#B91C1C] text-white'
                                    : 'border-[#F5B324]/30 bg-[#240306] text-[#F3D9A4]/80 hover:border-[#FCD34D] hover:text-[#FFF8EA]'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>Entière</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateDuelOutcome(
                                    duel.id,
                                    side,
                                    entry.outcome === 'partial' ? 'pending' : 'partial',
                                  )
                                }
                                className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold uppercase transition-colors cursor-pointer whitespace-nowrap ${
                                  entry.outcome === 'partial'
                                    ? 'border-[#FEF08A] bg-[#D97706] text-[#220306]'
                                    : 'border-[#F5B324]/30 bg-[#240306] text-[#F3D9A4]/80 hover:border-[#FCD34D] hover:text-[#FFF8EA]'
                                }`}
                              >
                                <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>Moitié (½)</span>
                              </button>
                            </div>
                          </div>
                        );

                        if (idx === 0) {
                          return (
                            <div key="hist-pair" className="contents">
                              {sideBlock}
                              <div className="flex items-center justify-center text-xs font-extrabold uppercase tracking-widest text-[#FCD34D]">
                                CONTRE
                              </div>
                            </div>
                          );
                        }

                        return sideBlock;
                      })}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
