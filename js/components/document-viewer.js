/**
 * Document viewer component - image with zoom/pan/scroll
 * Port of Views/Controls/DocumentViewerControl.xaml
 */
import { el } from '../utils/dom.js';

export class DocumentViewer {
  constructor() {
    this._zoomLevel = 1.0;
    this._minZoom = 0.25;
    this._maxZoom = 4.0;
    this._isPanning = false;
    this._panStartX = 0;
    this._panStartY = 0;
    this._scrollStartX = 0;
    this._scrollStartY = 0;
    this._container = null;
    this._inner = null;
    this._onZoomChange = null;
  }

  /**
   * Create the viewer element
   * @param {Object} options
   * @param {HTMLElement} options.content - Content to display (image + overlays)
   * @param {Function} [options.onZoomChange] - Callback when zoom changes
   * @returns {HTMLElement}
   */
  create({ content, onZoomChange }) {
    this._onZoomChange = onZoomChange;

    this._container = el('div', { className: 'document-viewer' });
    this._inner = el('div', { className: 'document-viewer-inner' });

    if (content) {
      this._inner.appendChild(content);
    }

    this._container.appendChild(this._inner);

    // Event handlers
    this._container.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this._container.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this._container.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this._container.addEventListener('mouseup', () => this._onMouseUp());
    this._container.addEventListener('mouseleave', () => this._onMouseUp());
    this._container.addEventListener('dblclick', () => this._resetZoom());

    this._updateTransform();
    return this._container;
  }

  get zoomLevel() { return this._zoomLevel; }

  set zoomLevel(val) {
    this._zoomLevel = Math.max(this._minZoom, Math.min(this._maxZoom, val));
    this._updateTransform();
  }

  _onWheel(e) {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.zoomLevel = this._zoomLevel + delta;
    if (this._onZoomChange) this._onZoomChange(this._zoomLevel);
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    this._isPanning = true;
    this._panStartX = e.clientX;
    this._panStartY = e.clientY;
    this._scrollStartX = this._container.scrollLeft;
    this._scrollStartY = this._container.scrollTop;
    this._container.classList.add('grabbing');
  }

  _onMouseMove(e) {
    if (!this._isPanning) return;
    const dx = e.clientX - this._panStartX;
    const dy = e.clientY - this._panStartY;
    this._container.scrollLeft = this._scrollStartX - dx;
    this._container.scrollTop = this._scrollStartY - dy;
  }

  _onMouseUp() {
    this._isPanning = false;
    this._container.classList.remove('grabbing');
  }

  _resetZoom() {
    this.zoomLevel = 1.0;
    if (this._onZoomChange) this._onZoomChange(1.0);
  }

  _updateTransform() {
    if (this._inner) {
      this._inner.style.transform = `scale(${this._zoomLevel})`;
    }
  }
}
