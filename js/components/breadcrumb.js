/**
 * Breadcrumb navigation component
 */
import { el } from '../utils/dom.js';

export class Breadcrumb {
  /**
   * Render a breadcrumb trail
   * @param {Array<{label: string, onClick?: Function, active?: boolean}>} items
   * @returns {HTMLElement}
   */
  static render(items) {
    const bc = el('div', { className: 'breadcrumb' });

    items.forEach((item, i) => {
      if (i > 0) {
        bc.appendChild(el('span', { className: 'breadcrumb-separator' }, '\u203A'));
      }

      const classes = ['breadcrumb-item'];
      if (item.active) classes.push('active');
      if (item.onClick) classes.push('clickable');

      const span = el('span', {
        className: classes.join(' '),
        onClick: item.onClick || null
      }, item.label);

      bc.appendChild(span);
    });

    return bc;
  }
}
