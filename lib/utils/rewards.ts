export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpToNextLevel(xp: number): number {
  return 100 - (xp % 100);
}

export function canClaimWLD(xp: number, threshold: number = 500): boolean {
  return xp >= threshold;
}

export function formatWLD(amount: number): string {
  return amount.toFixed(2) + ' WLD';
}

export function formatXP(amount: number): string {
  return amount + ' XP';
}
