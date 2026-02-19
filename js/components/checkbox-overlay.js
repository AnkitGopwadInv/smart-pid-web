/**
 * Checkbox overlay component - positioned checkboxes on image
 * Port of Views/Controls/CheckboxOverlayControl.xaml
 */
import { el } from '../utils/dom.js';
import { coordinateMapper } from '../services/coordinate-mapper.js';

export class CheckboxOverlay {
  /**
   * Render checkbox overlays for items
   * @param {Object} options
   * @param {Array} options.items - Items with bounding boxes
   * @param {number} options.docWidth - Document pixel width
   * @param {number} options.docHeight - Document pixel height
   * @param {number} options.zoomLevel
   * @param {Function} options.onToggle - Toggle callback
   * @param {Function} options.onHighlight - Highlight callback
   * @returns {HTMLElement}
   */
  static render({ items, docWidth, docHeight, zoomLevel, onToggle, onHighlight }) {
    const overlay = el('div', { className: 'checkbox-overlay' });

    for (const item of items) {
      if (!item.boundingBox || (item.boundingBox.x === 0 && item.boundingBox.y === 0)) continue;

      const coords = coordinateMapper.mapToViewerCoordinates(
        item.boundingBox, docWidth, docHeight, zoomLevel
      );

      let stateClass = '';
      if (item.isMandatory) stateClass = 'mandatory';
      else if (item.isSelected) stateClass = 'selected';

      const cbEl = el('div', {
        className: `checkbox-overlay-item ${stateClass}${item.isHighlighted ? ' highlighted' : ''}`,
        style: {
          left: `${coords.checkboxX}px`,
          top: `${coords.checkboxY - 11}px`
        },
        dataset: { itemId: item.id },
        onClick: () => onToggle?.(item),
        onMouseenter: () => onHighlight?.(item.id, true),
        onMouseleave: () => onHighlight?.(item.id, false)
      },
        el('div', { className: 'highlight-ring' }),
        el('div', { className: 'outer-ring' }),
        el('div', { className: 'checkbox-inner' },
          el('span', { className: 'check-icon' }, '\u2713'),
          el('span', { className: 'lock-icon' }, '\uD83D\uDD12')
        ),
        el('div', { className: 'checkbox-tooltip' },
          el('div', { className: 'checkbox-tooltip-name' }, item.text),
          item.isMandatory ? el('div', { className: 'checkbox-tooltip-mandatory' }, 'Required - cannot be deselected') : null
        )
      );

      overlay.appendChild(cbEl);
    }

    return overlay;
  }
}
