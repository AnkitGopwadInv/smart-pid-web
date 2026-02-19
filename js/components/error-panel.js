/**
 * Error panel component
 */
import { el } from '../utils/dom.js';

export class ErrorPanel {
  /**
   * Render an error panel
   * @param {string} message
   * @returns {HTMLElement}
   */
  static render(message) {
    return el('div', { className: 'error-panel' },
      el('span', { className: 'error-panel-icon' }, '\u26A0\uFE0F'),
      el('span', { className: 'error-panel-text' }, message)
    );
  }
}
