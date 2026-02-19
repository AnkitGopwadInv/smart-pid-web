/**
 * Sheet tabs component - tab control for sheets
 */
import { el } from '../utils/dom.js';

export class SheetTabs {
  /**
   * Render sheet tabs
   * @param {Object} options
   * @param {Array<{displayName: string}>} options.sheets
   * @param {number} options.activeIndex
   * @param {Function} options.onSelect - Callback(index)
   * @returns {HTMLElement}
   */
  static render({ sheets, activeIndex, onSelect }) {
    const tabs = el('div', { className: 'sheet-tabs' });

    sheets.forEach((sheet, i) => {
      const tab = el('button', {
        className: `sheet-tab${i === activeIndex ? ' active' : ''}`,
        onClick: () => onSelect?.(i)
      }, sheet.displayName);
      tabs.appendChild(tab);
    });

    return tabs;
  }
}
