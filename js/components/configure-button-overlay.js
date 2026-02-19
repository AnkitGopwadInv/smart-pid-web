/**
 * Configure button overlay component - positioned buttons on PFD diagram
 * Port of Views/Controls/ConfigureButtonOverlayControl.xaml
 */
import { el } from '../utils/dom.js';
import { coordinateMapper } from '../services/coordinate-mapper.js';

export class ConfigureButtonOverlay {
  /**
   * Render configure button overlays
   * @param {Object} options
   * @param {Array} options.buttons - Button items with bounding boxes
   * @param {number} options.docWidth
   * @param {number} options.docHeight
   * @param {number} options.zoomLevel
   * @param {Function} options.onConfigure - Configure callback(blockId)
   * @returns {HTMLElement}
   */
  static render({ buttons, docWidth, docHeight, zoomLevel, onConfigure }) {
    const overlay = el('div', { className: 'configure-btn-overlay' });

    for (const btn of buttons) {
      if (!btn.boundingBox) continue;

      const coords = coordinateMapper.mapToViewerCoordinates(
        btn.boundingBox, docWidth, docHeight, zoomLevel
      );

      const btnEl = el('div', {
        className: `configure-btn-item${btn.isConfigured ? ' configured' : ''}`,
        style: {
          left: `${coords.checkboxX}px`,
          top: `${coords.checkboxY - 12}px`
        }
      },
        el('button', {
          onClick: () => onConfigure?.(btn.blockId),
          title: `Configure ${btn.blockName}`
        },
          el('span', { className: 'btn-icon' }, btn.isConfigured ? '\u2713' : '\u2699'),
          'Configure'
        )
      );

      overlay.appendChild(btnEl);
    }

    return overlay;
  }
}
