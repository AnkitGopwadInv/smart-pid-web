/**
 * Empty state placeholder component
 */
import { el } from '../utils/dom.js';

export class EmptyState {
  /**
   * Render an empty state
   * @param {string} title
   * @param {string} [text]
   * @returns {HTMLElement}
   */
  static render(title, text) {
    return el('div', { className: 'empty-state' },
      el('div', { className: 'empty-state-title' }, title),
      text ? el('div', { className: 'empty-state-text' }, text) : null
    );
  }
}
