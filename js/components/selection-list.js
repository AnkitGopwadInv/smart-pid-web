/**
 * Selection list component - right panel item list
 * Port of BlockConfigurationView.xaml (right panel)
 */
import { el } from '../utils/dom.js';

export class SelectionList {
  /**
   * Render selection list items
   * @param {Object} options
   * @param {Array} options.items
   * @param {Function} options.onToggle
   * @param {Function} options.onHighlight
   * @returns {HTMLElement}
   */
  static render({ items, onToggle, onHighlight }) {
    const list = el('div', { className: 'selection-list' });

    for (const item of items) {
      let checkboxClass = 'selection-item-checkbox';
      let checkIcon = '';

      if (item.isMandatory) {
        checkboxClass += ' mandatory';
        checkIcon = '\uD83D\uDD12';
      } else if (item.isSelected) {
        checkboxClass += ' selected';
        checkIcon = '\u2713';
      }

      const itemEl = el('div', {
        className: `selection-item${item.isHighlighted ? ' highlighted' : ''}`,
        dataset: { itemId: item.id },
        onClick: () => onToggle?.(item),
        onMouseenter: () => onHighlight?.(item.id, true),
        onMouseleave: () => onHighlight?.(item.id, false)
      },
        el('div', { className: checkboxClass }, checkIcon),
        el('div', {},
          el('div', { className: 'selection-item-name' }, item.text),
          el('div', { className: 'selection-item-id' }, item.id)
        ),
        item.isMandatory ? el('div', { className: 'badge badge-mandatory' }, 'Required') : null
      );

      list.appendChild(itemEl);
    }

    return list;
  }
}
