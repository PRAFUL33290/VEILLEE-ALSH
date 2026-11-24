import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  FamilyOutcome,
  LevelAttemptStatus,
  SavedDuelRecord,
  sanitizeLevelResults,
} from '../components/FamilyDuelBar';

const DUELS_COLLECTION = 'duels';

function sanitizeOutcome(value: unknown): FamilyOutcome {
  if (value === 'complete' || value === 'partial' || value === 'pending') return value;
  return 'pending';
}

function clampName(name: string, fallback: string): string {
  const cleaned = name.trim().slice(0, 40);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeDuelId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length > 0 ? cleaned : `duel-${Date.now()}`;
}

function toStoredInt(value: number | null, max: number): number {
  if (value === null || !Number.isFinite(value)) return -1;
  return Math.max(0, Math.min(max, Math.round(value)));
}

function fromStoredInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function subscribeUserDuels(
  uid: string,
  onData: (duels: SavedDuelRecord[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(collection(db, DUELS_COLLECTION), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: SavedDuelRecord[] = snapshot.docs.map((snap) => {
        const d = snap.data();
        return {
          id: snap.id,
          duelNumber: typeof d.duelNumber === 'number' ? d.duelNumber : 1,
          recordedAtIso:
            typeof d.recordedAtIso === 'string'
              ? d.recordedAtIso
              : new Date().toISOString(),
          familyA: {
            name: typeof d.familyAName === 'string' ? d.familyAName : 'FAMILLE 1',
            outcome: sanitizeOutcome(d.familyAOutcome),
            levelResults: sanitizeLevelResults(d.familyALevelResults),
            mudrasReached: fromStoredInt(d.familyAMudrasReached),
            elapsedSec: fromStoredInt(d.familyAElapsedSec),
          },
          familyB: {
            name: typeof d.familyBName === 'string' ? d.familyBName : 'FAMILLE 2',
            outcome: sanitizeOutcome(d.familyBOutcome),
            levelResults: sanitizeLevelResults(d.familyBLevelResults),
            mudrasReached: fromStoredInt(d.familyBMudrasReached),
            elapsedSec: fromStoredInt(d.familyBElapsedSec),
          },
        };
      });

      records.sort((a, b) => {
        if (b.duelNumber !== a.duelNumber) return b.duelNumber - a.duelNumber;
        return b.recordedAtIso.localeCompare(a.recordedAtIso);
      });

      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, DUELS_COLLECTION);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function saveDuelToServer(
  uid: string,
  record: SavedDuelRecord,
): Promise<void> {
  const safeId = sanitizeDuelId(record.id);
  const path = `${DUELS_COLLECTION}/${safeId}`;
  const payload = {
    ownerId: uid,
    duelNumber: Math.max(1, Math.min(100000, Math.round(record.duelNumber))),
    recordedAtIso: record.recordedAtIso.slice(0, 40),
    familyAName: clampName(record.familyA.name, 'FAMILLE 1'),
    familyAOutcome: sanitizeOutcome(record.familyA.outcome),
    familyALevelResults: sanitizeLevelResults(record.familyA.levelResults),
    familyAMudrasReached: toStoredInt(record.familyA.mudrasReached, 11),
    familyAElapsedSec: toStoredInt(record.familyA.elapsedSec, 86400),
    familyBName: clampName(record.familyB.name, 'FAMILLE 2'),
    familyBOutcome: sanitizeOutcome(record.familyB.outcome),
    familyBLevelResults: sanitizeLevelResults(record.familyB.levelResults),
    familyBMudrasReached: toStoredInt(record.familyB.mudrasReached, 11),
    familyBElapsedSec: toStoredInt(record.familyB.elapsedSec, 86400),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, DUELS_COLLECTION, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDuelOutcomeOnServer(
  duelId: string,
  side: 'familyA' | 'familyB',
  outcome: FamilyOutcome,
): Promise<void> {
  const safeId = sanitizeDuelId(duelId);
  const path = `${DUELS_COLLECTION}/${safeId}`;
  const fieldKey = side === 'familyA' ? 'familyAOutcome' : 'familyBOutcome';

  try {
    await updateDoc(doc(db, DUELS_COLLECTION, safeId), {
      [fieldKey]: sanitizeOutcome(outcome),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateDuelLevelResultsOnServer(
  duelId: string,
  side: 'familyA' | 'familyB',
  levelResults: LevelAttemptStatus[],
): Promise<void> {
  const safeId = sanitizeDuelId(duelId);
  const path = `${DUELS_COLLECTION}/${safeId}`;
  const fieldKey = side === 'familyA' ? 'familyALevelResults' : 'familyBLevelResults';

  try {
    await updateDoc(doc(db, DUELS_COLLECTION, safeId), {
      [fieldKey]: sanitizeLevelResults(levelResults),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDuelOnServer(duelId: string): Promise<void> {
  const safeId = sanitizeDuelId(duelId);
  const path = `${DUELS_COLLECTION}/${safeId}`;
  try {
    await deleteDoc(doc(db, DUELS_COLLECTION, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
