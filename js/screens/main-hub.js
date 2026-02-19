/**
 * Screen 4: Main Hub
 * PFD diagram viewer with configure buttons overlay + collapsible right block panel.
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
    this._popoverHideTimer = null;
    this._isPopoverHovered = false;
    this._collapseBtn = null;
    this._blockListEl = null;
    this._blockCountEl = null;
    this._detailPopover = null;
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

    const breadcrumb = el('div', { className: 'main-hub-breadcrumb' },
      el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.DivisionSelection) }, division?.name || ''),
      el('span', { className: 'breadcrumb-separator' }, '\u203A'),
      el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.ProductSelection) }, product?.name || ''),
      el('span', { className: 'breadcrumb-separator' }, '\u203A'),
      el('span', { className: 'breadcrumb-item active' }, 'Configure')
    );

    this._progressEl = el('span', {}, '0/0');
    this._progressBarFill = el('div', { className: 'progress-bar-fill', style: { width: '0%' } });
    const progress = el('div', { className: 'main-hub-progress' },
      this._progressEl,
      el('div', { className: 'progress-bar-container' }, this._progressBarFill)
    );

    this._generateBtn = el('button', {
      className: 'btn btn-success',
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

    // Split body: viewer (left) + block panel (right)
    const splitBody = el('div', { className: 'main-hub-split' });

    // Left: viewer
    this._viewerContainer = el('div', { className: 'main-hub-viewer' });

    // Right: collapsible block panel
    const rightPanel = el('div', { className: 'main-hub-right' });
    this._blockCountEl = el('div', { className: 'hub-panel-count' }, '0 blocks');
    this._collapseBtn = el('button', {
      className: 'panel-collapse-btn',
      title: 'Collapse panel',
      onClick: () => this._toggleRightPanel()
    }, '\u00BB');

    const panelHeader = el('div', { className: 'hub-panel-header' },
      el('div', { className: 'hub-panel-header-top' },
        el('div', { className: 'hub-panel-title' }, 'PFD Blocks'),
        this._collapseBtn
      ),
      this._blockCountEl
    );

    this._blockListEl = el('div', { className: 'hub-block-list' });
    this._hubSummaryEl = el('div', { className: 'hub-panel-summary' }, '');
    rightPanel.append(panelHeader, this._blockListEl, this._hubSummaryEl);

    // Detail popover
    this._detailPopover = el('div', {
      className: 'item-detail-popover',
      onMouseenter: () => { this._isPopoverHovered = true; clearTimeout(this._popoverHideTimer); },
      onMouseleave: () => { this._isPopoverHovered = false; this._scheduleHidePopover(); }
    });
    this._detailPopover.style.display = 'none';

    splitBody.append(this._viewerContainer, rightPanel, this._detailPopover);

    container.append(header, splitBody);
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

  _toggleRightPanel() {
    const rightPanel = this._container?.querySelector('.main-hub-right');
    if (!rightPanel) return;
    const isCollapsed = rightPanel.classList.toggle('main-hub-right-collapsed');
    this._collapseBtn.textContent = isCollapsed ? '\u00AB' : '\u00BB';
    this._collapseBtn.title = isCollapsed ? 'Expand panel' : 'Collapse panel';
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
    this._renderBlockList();
  }

  _renderBlockList() {
    this._blockListEl.innerHTML = '';

    for (const block of this._blocks) {
      const statusIcon = block.isConfigured ? '\u2713' : '\u2699';
      const statusClass = block.isConfigured ? 'configured' : 'pending';
      const sheetCount = mockDataService.getSheetNames(block.id).length;

      const itemEl = el('div', {
        className: `hub-block-item ${statusClass}`,
        onMouseenter: (e) => { clearTimeout(this._popoverHideTimer); this._showBlockPopover(block, e.currentTarget); },
        onMouseleave: () => { this._scheduleHidePopover(); }
      },
        el('div', { className: `hub-block-status ${statusClass}` }, statusIcon),
        el('div', { className: 'hub-block-info' },
          el('div', { className: 'hub-block-name' }, block.name),
          el('div', { className: 'hub-block-meta' },
            block.is_mandatory ? el('span', { className: 'hub-badge mandatory' }, 'Required') : el('span', { className: 'hub-badge optional' }, 'Optional'),
            el('span', { className: 'hub-badge sheets' }, `${sheetCount} sheets`)
          )
        ),
        el('button', {
          className: `hub-block-config-btn ${statusClass}`,
          onClick: () => this._onConfigureBlock(block.id)
        }, block.isConfigured ? 'Edit' : 'Configure')
      );

      this._blockListEl.appendChild(itemEl);
    }

    const configured = this._blocks.filter(b => b.isConfigured).length;
    const total = this._blocks.length;
    this._blockCountEl.textContent = `${total} blocks`;
    this._hubSummaryEl.textContent = `${configured} of ${total} configured`;
  }

  _showBlockPopover(block, targetEl) {
    if (!this._detailPopover) return;

    const statusText = block.isConfigured ? 'Configured' : 'Pending';
    const statusClass = block.isConfigured ? 'selected' : 'optional';
    const sheetNames = mockDataService.getSheetNames(block.id);
    const savedConfig = sessionStateService.getBlockConfiguration(block.id);

    // Count items across all sheets
    let totalItems = 0;
    let selectedItems = 0;
    let mandatoryItems = 0;
    for (const sheetName of sheetNames) {
      const items = mockDataService.getExcelItems(block.id, sheetName);
      totalItems += items.length;
      mandatoryItems += items.filter(i => i.isMandatory).length;
      if (savedConfig?.sheetConfigurations?.[sheetName]) {
        selectedItems += savedConfig.sheetConfigurations[sheetName].selectedItemIds.length;
      } else {
        selectedItems += items.filter(i => i.isMandatory).length;
      }
    }

    // Mock specs
    const hash = block.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const capacities = ['50 TPH', '75 TPH', '100 TPH', '120 TPH', '150 TPH'];
    const pressures = ['45 kg/cm\u00B2', '66 kg/cm\u00B2', '87 kg/cm\u00B2', '110 kg/cm\u00B2'];
    const temps = ['485\u00B0C', '510\u00B0C', '540\u00B0C'];

    // Build analysis metrics
    const completionPct = totalItems > 0 ? Math.round((selectedItems / totalItems) * 100) : 0;
    const mandatoryPct = totalItems > 0 ? Math.round((mandatoryItems / totalItems) * 100) : 0;
    const configPct = block.isConfigured ? 100 : Math.round(completionPct * 0.6);

    const metrics = [
      { label: 'Items', value: completionPct, colorClass: 'bar-ocr' },
      { label: 'Mand', value: mandatoryPct, colorClass: 'bar-match' },
      { label: 'Config', value: configPct, colorClass: 'bar-valid' },
      { label: 'Ready', value: block.isConfigured ? 100 : 0, colorClass: 'bar-compl' }
    ];

    const chartBars = metrics.map(m =>
      el('div', { className: 'popover-chart-col' },
        el('div', { className: 'popover-chart-bar-wrap' },
          el('div', { className: `popover-chart-bar ${m.colorClass}`, style: { height: `${m.value}%` } })
        ),
        el('div', { className: 'popover-chart-label' }, m.label)
      )
    );

    // Completion gauge
    const gaugeClass = completionPct >= 80 ? 'high' : (completionPct >= 50 ? 'medium' : 'low');

    this._detailPopover.innerHTML = '';
    this._detailPopover.append(
      el('div', { className: 'detail-popover-header' },
        el('div', {},
          el('div', { className: 'detail-popover-name' }, block.name),
          el('div', { className: 'detail-popover-subtitle' }, block.is_mandatory ? 'Mandatory Block' : 'Optional Block')
        ),
        el('div', { className: `detail-popover-status ${statusClass}` }, statusText)
      ),
      el('div', { className: 'detail-popover-body' },
        el('div', { className: 'popover-section' },
          el('div', { className: 'popover-section-title' }, 'Block Details'),
          this._propRow('Block ID', block.id),
          this._propRow('Sheets', `${sheetNames.length} (${sheetNames.join(', ')})`),
          this._propRow('Total Items', String(totalItems)),
          this._propRow('Selected', `${selectedItems} / ${totalItems}`)
        ),
        el('div', { className: 'popover-section' },
          el('div', { className: 'popover-section-title' }, 'Design Parameters'),
          this._propRow('Capacity', capacities[hash % capacities.length]),
          this._propRow('Pressure', pressures[hash % pressures.length]),
          this._propRow('Temperature', temps[hash % temps.length]),
          this._propRow('Fuel Type', hash % 2 === 0 ? 'Biomass' : 'Multi-fuel')
        ),
        el('div', { className: 'popover-gauge' },
          el('div', { className: 'popover-gauge-label' },
            el('span', {}, 'Completion'),
            el('span', { className: `confidence-val ${gaugeClass}` }, `${completionPct}%`)
          ),
          el('div', { className: 'popover-gauge-track' },
            el('div', { className: `popover-gauge-fill ${gaugeClass}`, style: { width: `${completionPct}%` } })
          )
        ),
        el('div', { className: 'popover-chart' },
          el('div', { className: 'popover-section-title' }, 'Configuration Metrics'),
          el('div', { className: 'popover-chart-bars' }, ...chartBars)
        )
      )
    );

    // Position popover centered vertically, left of right panel
    const splitRect = this._detailPopover.parentElement.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const rightPanel = this._container?.querySelector('.main-hub-right');
    const rightRect = rightPanel?.getBoundingClientRect();

    this._detailPopover.style.display = 'block';

    const popoverHeight = this._detailPopover.offsetHeight;
    const targetCenter = targetRect.top + targetRect.height / 2 - splitRect.top;
    let topPos = targetCenter - popoverHeight / 2;
    if (topPos + popoverHeight > splitRect.height - 8) topPos = splitRect.height - popoverHeight - 8;
    if (topPos < 8) topPos = 8;

    this._detailPopover.style.top = `${topPos}px`;
    if (rightRect) {
      this._detailPopover.style.right = `${splitRect.right - rightRect.left + 8}px`;
    }
  }

  _scheduleHidePopover() {
    clearTimeout(this._popoverHideTimer);
    this._popoverHideTimer = setTimeout(() => {
      if (!this._isPopoverHovered) {
        this._detailPopover.style.display = 'none';
      }
    }, 150);
  }

  _propRow(label, value) {
    return el('div', { className: 'detail-prop-row' },
      el('div', { className: 'detail-prop-label' }, label),
      el('div', { className: 'detail-prop-value' }, value)
    );
  }

  _createViewerWithButtons() {
    const textractResult = mockDataService.getPfdTextractResults();

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

    this._renderPfdDiagram();
  }

  _renderPfdDiagram() {
    this._viewerContainer.innerHTML = '';

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

    this._viewer = new DocumentViewer();
    const viewerEl = this._viewer.create({ content });
    this._viewerContainer.appendChild(viewerEl);
  }

  _onConfigureBlock(blockId) {
    navigationService.setSelectedPfdBlock(blockId);
    navigationService.navigateTo(Screen.BlockConfiguration);
  }

  _updateProgress() {
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
    // Generate button always enabled

    if (this.isMounted) {
      this._renderPfdDiagram();
      this._renderBlockList();
    }
  }

  _onGenerate() {
    // Navigate to first block's configuration (Step 5)
    const firstBlockId = this._blocks.length > 0 ? this._blocks[0].id : null;
    if (firstBlockId) {
      navigationService.setSelectedPfdBlock(firstBlockId);
      navigationService.navigateTo(Screen.BlockConfiguration);
    }
  }

  _onStartOver() {
    if (confirm('Are you sure you want to start over? All configuration will be lost.')) {
      sessionStateService.clearAll();
      navigationService.reset();
    }
  }
}
