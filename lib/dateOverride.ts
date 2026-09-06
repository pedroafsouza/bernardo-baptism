/**
 * Support for overriding the current date for testing multi-day scoring.
 * Set OVERRIDE_DATE environment variable (format: YYYY-MM-DD) to simulate a different date.
 *
 * Example: OVERRIDE_DATE=2026-09-07 npm run dev
 */

/**
 * Get the current date, or an overridden date if OVERRIDE_DATE is set.
 * Only works when called from Node.js (not in browser).
 */
export function getCurrentDate(): Date {
  // Only check environment variable on server-side
  if (typeof process === "undefined" || !process.env) {
    return new Date();
  }

  const override = process.env.OVERRIDE_DATE;
  if (!override) {
    return new Date();
  }

  // Validate format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
    console.warn(
      `⚠️  OVERRIDE_DATE format invalid: "${override}". Expected YYYY-MM-DD. Using current date.`
    );
    return new Date();
  }

  // Parse as UTC date to avoid timezone confusion
  const date = new Date(`${override}T00:00:00Z`);
  if (isNaN(date.getTime())) {
    console.warn(`⚠️  OVERRIDE_DATE is invalid: "${override}". Using current date.`);
    return new Date();
  }

  console.log(`📅 Using overridden date: ${override}`);
  return date;
}
