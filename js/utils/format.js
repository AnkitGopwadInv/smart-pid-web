/**
 * Formatting utilities
 */

/**
 * Format a confidence value as percentage
 * @param {number} confidence
 * @returns {string}
 */
export function formatConfidence(confidence) {
  return `${Math.round(confidence)}%`;
}

/**
 * Pluralize a word based on count
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string}
 */
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || singular + 's');
}
