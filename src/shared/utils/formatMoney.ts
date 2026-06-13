const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

/**
 * Formats integer cents to a Philippine Peso string.
 * All monetary values in WatermelonDB are stored as integer cents.
 *
 * centsToPHP(9950) → "₱99.50"
 */
export function centsToPHP(cents: number): string {
  return CURRENCY_FORMATTER.format(cents / 100);
}

/** PHP decimal → integer cents. Use at the boundary where the user types money. */
export function phpToCents(php: number): number {
  return Math.round(php * 100);
}

/** Safe multiplication that stays in integer cents. */
export function multiplyCents(cents: number, quantity: number): number {
  return Math.round(cents * quantity);
}

/** Integer-safe percentage of cents, rounded to nearest cent. */
export function percentOfCents(cents: number, rate: number): number {
  return Math.round(cents * rate);
}
