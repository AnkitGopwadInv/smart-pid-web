/**
 * Document viewer component - zoom / pan / scroll / fullscreen.
 *
 * Controls:
 *   Ctrl + mouse-wheel  →  zoom in / out  (like Figma / Google Maps)
 *   Mouse wheel          →  vertical scroll (native)
 *   Shift + wheel        →  horizontal scroll (native)
 *   Click + drag         →  pan in any direction
 *   Buttons              →  −  +  Fit  1:1  Fullscreen
 *
 * Zoom resizes the <img> directly so the scroll container always
 * knows the real content size → scrollbars + drag work in both axes.
 */
import { el } from '../utils/dom.js';

export class DocumentViewer {
  constructor() {
    this._zoomLevel = 1.0;
    this._minZoom = 0.2;
    this._maxZoom = 5.0;
    this._zoomStep = 0.15;
    this._isPanning = false;
    this._panStartX = 0;
    this._panStartY = 0;
    this._scrollStartX = 0;
    this._scrollStartY = 0;
    this._container = null;
    this._wrapper = null;
    this._contentEl = null;
    this._zoomLabel = null;
    this._fullscreenBtn = null;
    this._onZoomChange = null;
    this._boundMouseMove = (e) => this._onMouseMove(e);
    this._boundMouseUp = () => this._onMouseUp();
    this._onFullscreenChange = this._onFullscreenChange.bind(this);
  }

  create({ content, onZoomChange }) {
    this._onZoomChange = onZoomChange;
    this._contentEl = content;

    this._wrapper = el('div', { className: 'document-viewer-wrapper' });

    // Fullscreen button
    this._fullscreenBtn = el('button', {
      className: 'zoom-btn zoom-btn-fullscreen',
      title: 'Toggle fullscreen',
      onClick: () => this._toggleFullscreen()
    }, el('span', { className: 'fullscreen-icon' }, '\u26F6'));

    // Zoom controls bar
    this._zoomLabel = el('span', { className: 'zoom-label' }, '100%');
    const controls = el('div', { className: 'zoom-controls' },
      el('button', {
        className: 'zoom-btn',
        title: 'Zoom out',
        onClick: () => this._zoomBy(-this._zoomStep)
      }, '\u2212'),
      this._zoomLabel,
      el('button', {
        className: 'zoom-btn',
        title: 'Zoom in',
        onClick: () => this._zoomBy(this._zoomStep)
      }, '+'),
      el('button', {
        className: 'zoom-btn zoom-btn-text',
        title: 'Fit to width',
        onClick: () => this._fitToWidth()
      }, 'Fit'),
      el('button', {
        className: 'zoom-btn zoom-btn-text',
        title: 'Reset zoom (100%)',
        onClick: () => this._setZoom(1.0)
      }, '1:1'),
      el('div', { style: { flex: '1' } }),
      el('span', { className: 'zoom-hint' }, 'Ctrl + Scroll to zoom'),
      this._fullscreenBtn
    );

    // Scroll container
    this._container = el('div', { className: 'document-viewer' });
    if (content) {
      this._container.appendChild(content);
    }

    // Ctrl + wheel = zoom;  plain wheel = native scroll (vertical / horizontal)
    this._container.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    // Click + drag = pan
    this._container.addEventListener('mousedown', (e) => this._onMouseDown(e));
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);

    // Double-click = reset zoom
    this._container.addEventListener('dblclick', (e) => {
      if (e.target.closest('.configure-btn-item') || e.target.closest('.checkbox-overlay-item')) return;
      this._setZoom(1.0);
    });

    // Fullscreen
    document.addEventListener('fullscreenchange', this._onFullscreenChange);

    this._wrapper.append(controls, this._container);

    // Apply initial zoom after image loads
    if (content) {
      const img = content.querySelector('img');
      if (img) {
        const apply = () => this._applyZoom();
        img.addEventListener('load', apply);
        if (img.complete && img.naturalWidth > 0) apply();
      }
    }

    return this._wrapper;
  }

  get zoomLevel() { return this._zoomLevel; }

  /** Re-apply current zoom (call after overlay content is re-rendered) */
  refreshZoom() {
    this._applyZoom();
  }

  /* ---- Wheel: Ctrl = zoom, otherwise native scroll ---- */

  _onWheel(e) {
    if (!e.ctrlKey) return;          // let browser scroll normally
    e.preventDefault();              // only block when zooming
    const delta = e.deltaY > 0 ? -this._zoomStep : this._zoomStep;
    this._zoomBy(delta);
  }

  /* ---- Zoom ---- */

  _zoomBy(delta) {
    this._setZoom(this._zoomLevel + delta);
  }

  _setZoom(level) {
    this._zoomLevel = Math.max(this._minZoom, Math.min(this._maxZoom, level));
    this._applyZoom();
    this._updateLabel();
    if (this._onZoomChange) this._onZoomChange(this._zoomLevel);
  }

  _applyZoom() {
    if (!this._contentEl) return;
    const img = this._contentEl.querySelector('img');
    if (!img || !img.naturalWidth) return;

    const z = this._zoomLevel;

    // Resize image directly → real scrollable area in both axes
    img.style.width = `${Math.round(img.naturalWidth * z)}px`;
    img.style.height = `${Math.round(img.naturalHeight * z)}px`;

    // Scale overlays to match
    const children = this._contentEl.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'IMG') continue;
      child.style.transform = `scale(${z})`;
      child.style.transformOrigin = '0 0';
      child.style.width = `${img.naturalWidth}px`;
      child.style.height = `${img.naturalHeight}px`;
    }
  }

  _fitToWidth() {
    if (!this._container || !this._contentEl) return;
    const img = this._contentEl.querySelector('img');
    if (!img || !img.naturalWidth) return;
    const containerWidth = this._container.clientWidth;
    const fitZoom = (containerWidth - 10) / img.naturalWidth;
    this._setZoom(fitZoom);
  }

  /* ---- Drag-to-pan (works even when mouse leaves viewer) ---- */

  _onMouseDown(e) {
    if (e.target.closest('button') || e.target.closest('.checkbox-overlay-item') || e.target.closest('.configure-btn-item')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    this._isPanning = true;
    this._panStartX = e.clientX;
    this._panStartY = e.clientY;
    this._scrollStartX = this._container.scrollLeft;
    this._scrollStartY = this._container.scrollTop;
    this._container.classList.add('grabbing');
  }

  _onMouseMove(e) {
    if (!this._isPanning) return;
    e.preventDefault();
    this._container.scrollLeft = this._scrollStartX - (e.clientX - this._panStartX);
    this._container.scrollTop = this._scrollStartY - (e.clientY - this._panStartY);
  }

  _onMouseUp() {
    if (!this._isPanning) return;
    this._isPanning = false;
    this._container.classList.remove('grabbing');
  }

  /* ---- Label ---- */

  _updateLabel() {
    if (this._zoomLabel) {
      this._zoomLabel.textContent = `${Math.round(this._zoomLevel * 100)}%`;
    }
  }

  /* ---- Fullscreen ---- */

  _toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (this._wrapper) {
      this._wrapper.requestFullscreen();
    }
  }

  _onFullscreenChange() {
    const isFullscreen = document.fullscreenElement === this._wrapper;
    if (this._fullscreenBtn) {
      const icon = this._fullscreenBtn.querySelector('.fullscreen-icon');
      if (icon) {
        icon.textContent = isFullscreen ? '\u2716' : '\u26F6';
      }
      this._fullscreenBtn.title = isFullscreen ? 'Exit fullscreen (Esc)' : 'Toggle fullscreen';
    }
  }
}
