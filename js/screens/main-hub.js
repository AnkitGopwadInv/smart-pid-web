/**
 * Screen 4: Main Hub
 * Port of Views/MainHubView.xaml + ViewModels/MainHubViewModel.cs
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';
import { sessionStateService } from '../services/session-state-service.js';
import { mockDataService } from '../services/mock-data-service.js';
import { coordinateMapper } from '../services/coordinate-mapper.js';
import { eventBus } from '../services/event-bus.js';
import { DocumentViewer } from '../components/document-viewer.js';

export class MainHubScreen extends BaseScreen {
  constructor() {
    super();
    this._blocks = [];
    this._configureButtons = [];
    this._progressEl = null;
    this._progressBarFill = null;
    this._generateBtn = null;
    this._viewer = null;
    this._unsubscribes = [];
  }

  render() {
    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    const products = catalogService.getProducts(divisionId);
    const product = products.find(p => p.id === productId);

    const container = el('div', { className: 'main-hub' });

    // Header row
    const header = el('div', { className: 'main-hub-header' });

    // Breadcrumb
    const breadcrumb = el('div', { className: 'main-hub-breadcrumb' },
      el('span', { style: { color: 'var(--text-muted)', fontSize: '11px' } }, division?.name || ''),
      el('span', { style: { color: 'var(--border-light)', margin: '0 3px', fontSize: '11px' } }, '\u203A'),
      el('span', { style: { color: 'var(--text-muted)', fontSize: '11px' } }, product?.name || ''),
      el('span', { style: { color: 'var(--border-light)', margin: '0 3px', fontSize: '11px' } }, '\u203A'),
      el('span', { style: { color: 'var(--accent-primary)', fontSize: '11px', fontWeight: '600' } }, 'Configure')
    );

    // Progress
    this._progressEl = el('span', {}, '0/0');
    this._progressBarFill = el('div', { className: 'progress-bar-fill', style: { width: '0%' } });
    const progress = el('div', { className: 'main-hub-progress' },
      this._progressEl,
      el('div', { className: 'progress-bar-container' }, this._progressBarFill)
    );

    // Action buttons
    this._generateBtn = el('button', {
      className: 'btn btn-success',
      disabled: 'disabled',
      onClick: () => this._onGenerate()
    }, '\u26A1 Generate');

    const actions = el('div', { className: 'main-hub-actions' },
      el('button', {
        className: 'btn btn-secondary',
        onClick: () => navigationService.navigateTo(Screen.PfdBlockSelection)
      }, '\u2190 Back'),
      el('button', {
        className: 'btn btn-startover',
        onClick: () => this._onStartOver()
      }, 'Start Over'),
      this._generateBtn
    );

    header.append(breadcrumb, progress, el('div', { style: { flex: '1' } }), actions);

    // Viewer area
    this._viewerContainer = el('div', { className: 'main-hub-viewer' });

    container.append(header, this._viewerContainer);
    return container;
  }

  onMount() {
    this._loadBlocks();
    const unsub = eventBus.on('configuration:changed', () => this._updateProgress());
    this._unsubscribes.push(unsub);
  }

  onUnmount() {
    this._unsubscribes.forEach(fn => fn());
    this._unsubscribes = [];
  }

  _loadBlocks() {
    const selectedBlockIds = navigationService.selectedPfdBlockIds;
    if (selectedBlockIds.length === 0) {
      navigationService.navigateTo(Screen.PfdBlockSelection);
      return;
    }

    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const allBlocks = catalogService.getPfdBlocks(divisionId, productId);

    this._blocks = selectedBlockIds
      .map(id => allBlocks.find(b => b.id === id))
      .filter(Boolean)
      .map(b => ({
        ...b,
        isConfigured: sessionStateService.isBlockConfigured(b.id)
      }));

    this._updateProgress();
    this._createViewerWithButtons();
  }

  _createViewerWithButtons() {
    // Get mock textract data for PFD diagram
    const textractResult = mockDataService.getPfdTextractResults();

    // Match blocks to text locations
    this._configureButtons = [];
    for (const block of this._blocks) {
      const normalizedName = block.name.trim().toUpperCase();
      const matched = textractResult.items.find(item => {
        const normalizedText = item.text.trim().toUpperCase();
        return normalizedName === normalizedText ||
               normalizedName.includes(normalizedText) ||
               normalizedText.includes(normalizedName);
      });

      if (matched) {
        this._configureButtons.push({
          blockId: block.id,
          blockName: block.name,
          boundingBox: matched.boundingBox,
          confidence: matched.confidence,
          isConfigured: block.isConfigured
        });
      }
    }

    // Create a placeholder PFD diagram image (canvas-based)
    this._renderPfdDiagram();
  }

  _renderPfdDiagram() {
    this._viewerContainer.innerHTML = '';

    // Build content: image + overlay (will be placed inside DocumentViewer inner)
    const content = el('div', {
      style: { position: 'relative', display: 'inline-block' }
    });

    const img = document.createElement('img');
    img.src = 'assets/images/pfd-bidrum-boilers.png';
    img.style.display = 'block';
    img.alt = 'PFD - Bidrum Boilers';

    const overlay = el('div', {
      style: { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' }
    });

    const addButtons = (imgWidth, imgHeight) => {
      overlay.style.width = `${imgWidth}px`;
      overlay.style.height = `${imgHeight}px`;
      overlay.innerHTML = '';

      for (const btn of this._configureButtons) {
        const coords = coordinateMapper.mapToViewerCoordinates(
          btn.boundingBox, imgWidth, imgHeight, 1.0
        );

        const buttonEl = el('div', {
          className: `configure-btn-item${btn.isConfigured ? ' configured' : ''}`,
          style: {
            position: 'absolute',
            left: `${coords.checkboxX}px`,
            top: `${coords.checkboxY - 12}px`,
            pointerEvents: 'auto'
          }
        },
          el('button', {
            onClick: () => this._onConfigureBlock(btn.blockId),
            title: `Configure ${btn.blockName}`
          },
            el('span', { className: 'btn-icon' }, btn.isConfigured ? '\u2713' : '\u2699'),
            'Configure'
          )
        );

        overlay.appendChild(buttonEl);
      }
    };

    img.onload = () => {
      addButtons(img.naturalWidth, img.naturalHeight);
    };

    if (img.complete && img.naturalWidth > 0) {
      addButtons(img.naturalWidth, img.naturalHeight);
    }

    content.append(img, overlay);

    // Wrap in DocumentViewer for zoom/pan
    this._viewer = new DocumentViewer();
    const viewerEl = this._viewer.create({ content });
    this._viewerContainer.appendChild(viewerEl);
  }

  _onConfigureBlock(blockId) {
    navigationService.setSelectedPfdBlock(blockId);
    navigationService.navigateTo(Screen.BlockConfiguration);
  }

  _updateProgress() {
    // Refresh block configured states
    for (const block of this._blocks) {
      block.isConfigured = sessionStateService.isBlockConfigured(block.id);
    }

    const configured = this._blocks.filter(b => b.isConfigured).length;
    const total = this._blocks.length;
    const percent = total > 0 ? Math.round((configured / total) * 100) : 0;

    if (this._progressEl) {
      this._progressEl.textContent = `${configured}/${total}`;
    }
    if (this._progressBarFill) {
      this._progressBarFill.style.width = `${percent}%`;
    }
    if (this._generateBtn) {
      this._generateBtn.disabled = configured !== total || total === 0;
    }

    // Re-render configure buttons to update their state
    if (this.isMounted) {
      this._renderPfdDiagram();
    }
  }

  _onGenerate() {
    alert('P&ID generation triggered! All blocks are configured.');
  }

  _onStartOver() {
    if (confirm('Are you sure you want to start over? All configuration will be lost.')) {
      sessionStateService.clearAll();
      navigationService.reset();
    }
  }
}
