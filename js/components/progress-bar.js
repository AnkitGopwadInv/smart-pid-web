/**
 * Progress bar component - X/Y progress indicator
 */
import { el } from '../utils/dom.js';

export class ProgressBar {
  /**
   * Render a progress bar
   * @param {Object} options
   * @param {number} options.current
   * @param {number} options.total
   * @returns {HTMLElement}
   */
  static render({ current, total }) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    return el('div', { className: 'main-hub-progress' },
      el('span', {}, `${current}/${total}`),
      el('div', { className: 'progress-bar-container' },
        el('div', { className: 'progress-bar-fill', style: { width: `${percent}%` } })
      )
    );
  }
}
