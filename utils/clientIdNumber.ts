let lastTimestamp = 0;

/** Generate 13 numerals: local DOB (YYMMDD) and the last seven timestamp digits. */
export function generateClientIdNumber(dateOfBirth: Date): string {
  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new Error('A valid date of birth is required');
  }

  // Keep consecutive IDs distinct even when generated in the same millisecond.
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  const year = String(dateOfBirth.getFullYear()).slice(-2).padStart(2, '0');
  const month = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
  const day = String(dateOfBirth.getDate()).padStart(2, '0');
  const suffix = String(lastTimestamp).slice(-7).padStart(7, '0');

  return `${year}${month}${day}${suffix}`;
}
