export interface MudraSector {
  readonly id: number;
  readonly name: string;
  readonly meaningFr: string;
  readonly colorHex: string;
  readonly accentHex: string;
  readonly textHex: string;
  readonly colorLabel: string;
}

export interface SequenceEntry {
  readonly uid: string;
  readonly mudra: MudraSector;
}

export interface GameLevel {
  readonly index: number;
  readonly label: string;
  readonly shortLabel: string;
  readonly targetCount: number;
  readonly defaultTimerSeconds: number;
  readonly isFinale: boolean;
}

export const PALETTE = {
  gold: '#F5B324',
  amber: '#D97706',
  crimson: '#C41E24',
  burgundy: '#6B0F1A',
  cream: '#FFF8EA',
  ink: '#2B0508',
} as const;

const SECTOR_THEMES = [
  {
    colorHex: PALETTE.gold,
    accentHex: '#B45309',
    textHex: '#2B0508',
    colorLabel: 'Or royal',
  },
  {
    colorHex: PALETTE.crimson,
    accentHex: '#7F1014',
    textHex: '#FFFFFF',
    colorLabel: 'Rouge carmin',
  },
  {
    colorHex: PALETTE.amber,
    accentHex: '#92400E',
    textHex: '#FFFFFF',
    colorLabel: 'Or ambré',
  },
  {
    colorHex: PALETTE.burgundy,
    accentHex: '#3D060D',
    textHex: '#FDE68A',
    colorLabel: 'Grenat profond',
  },
] as const;

const MUDRA_DEFINITIONS = [
  { name: 'Pataka', meaningFr: 'Drapeau' },
  { name: 'Tripataka', meaningFr: 'Drapeau en trois' },
  { name: 'Kartharimukha', meaningFr: 'Ciseaux' },
  { name: 'Ardhachandra', meaningFr: 'Demi-lune' },
  { name: 'Mushti', meaningFr: 'Poing fermé' },
  { name: 'Shikhara', meaningFr: 'Sommet, pic' },
  { name: 'Suchi', meaningFr: 'Aiguille' },
  { name: 'Chandrakala', meaningFr: 'Croissant de lune' },
  { name: 'Padmakosha', meaningFr: 'Bouton de lotus' },
  { name: 'Alapadma', meaningFr: 'Lotus épanoui' },
  { name: 'Mukula', meaningFr: 'Fleur en bourgeon' },
  { name: 'Trishula', meaningFr: 'Trident' },
] as const;

export const MUDRAS: readonly MudraSector[] = MUDRA_DEFINITIONS.map((def, index) => {
  const theme = SECTOR_THEMES[index % SECTOR_THEMES.length];
  return {
    id: index,
    name: def.name,
    meaningFr: def.meaningFr,
    colorHex: theme.colorHex,
    accentHex: theme.accentHex,
    textHex: theme.textHex,
    colorLabel: theme.colorLabel,
  };
});

export const SECTOR_COUNT = MUDRAS.length; // 12
export const TWO_PI = Math.PI * 2;
export const SECTOR_ANGLE = TWO_PI / SECTOR_COUNT; // Math.PI / 6 (30 deg)

export const LEVELS: readonly GameLevel[] = [
  { index: 0, label: 'Niveau 1', shortLabel: 'Niv. 1', targetCount: 2, defaultTimerSeconds: 20, isFinale: false },
  { index: 1, label: 'Niveau 2', shortLabel: 'Niv. 2', targetCount: 3, defaultTimerSeconds: 25, isFinale: false },
  { index: 2, label: 'Niveau 3', shortLabel: 'Niv. 3', targetCount: 4, defaultTimerSeconds: 30, isFinale: false },
  { index: 3, label: 'Niveau 4', shortLabel: 'Niv. 4', targetCount: 5, defaultTimerSeconds: 40, isFinale: false },
  { index: 4, label: 'Niveau 5', shortLabel: 'Niv. 5', targetCount: 6, defaultTimerSeconds: 50, isFinale: false },
  { index: 5, label: 'Finale', shortLabel: 'Finale', targetCount: 7, defaultTimerSeconds: 60, isFinale: true },
] as const;

/**
 * Unbiased uniform random integer in [0, count - 1].
 * Uses crypto.getRandomValues() with rejection sampling to avoid modulo bias,
 * falling back to Math.random() only when Web Crypto is unavailable.
 */
export function getUniformRandomInt(count: number): number {
  if (count <= 1) return 0;
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const maxUint32 = 0x100000000;
    const limit = Math.floor(maxUint32 / count) * count;
    const buffer = new Uint32Array(1);
    let value = 0;
    do {
      window.crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % count;
  }
  return Math.floor(Math.random() * count);
}

/**
 * Uniform random float in [min, max).
 */
export function getUniformRandomFloat(min: number, max: number): number {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    const unit = buffer[0] / 0x100000000;
    return min + unit * (max - min);
  }
  return min + Math.random() * (max - min);
}

/**
 * Given the Three.js wheelGroup.rotation.z angle (in radians), returns the exact
 * sector index [0..11] currently centered under the fixed top (12 o'clock) pointer.
 *
 * Geometry convention:
 * - Sector i is drawn on the wheel face centered at i * 30° clockwise from 12 o'clock.
 * - Positive rotation.z rotates the wheel counter-clockwise, bringing sector i
 *   exactly to 12 o'clock when rotation.z ≡ +i * (2π / 12) (mod 2π).
 */
export function getSectorIndexAtRotation(rotationZ: number): number {
  const normalized = ((rotationZ % TWO_PI) + TWO_PI) % TWO_PI;
  const rawIndex = Math.round(normalized / SECTOR_ANGLE) % SECTOR_COUNT;
  return (rawIndex + SECTOR_COUNT) % SECTOR_COUNT;
}

/**
 * Computes the exact clockwise target rotationZ from currentRotationZ so that:
 * 1. The wheel completes between 5 and 7 full clockwise revolutions (negative rotationZ).
 * 2. The wheel lands EXACTLY at the geometric center of `targetSectorIndex` under the top pointer.
 * 3. `getSectorIndexAtRotation(targetRotationZ) === targetSectorIndex` is mathematically guaranteed.
 */
export function computeTargetSpinRotation(currentRotationZ: number, targetSectorIndex: number): number {
  const currentMod = ((currentRotationZ % TWO_PI) + TWO_PI) % TWO_PI;
  const targetMod = (((targetSectorIndex % SECTOR_COUNT) + SECTOR_COUNT) % SECTOR_COUNT) * SECTOR_ANGLE;

  // Clockwise delta (subtracting from rotationZ moves clockwise in Three.js XY plane)
  const cwDelta = ((currentMod - targetMod) % TWO_PI + TWO_PI) % TWO_PI;
  const fullTurns = 5 + getUniformRandomInt(3); // 5, 6, or 7 full revolutions

  return currentRotationZ - (fullTurns * TWO_PI + cwDelta);
}
