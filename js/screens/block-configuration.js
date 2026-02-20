/**
 * Screen 5: Block Configuration
 * Port of Views/BlockConfigurationView.xaml + ViewModels/BlockConfigurationViewModel.cs
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';
import { sessionStateService } from '../services/session-state-service.js';
import { mockDataService } from '../services/mock-data-service.js';
import { matchingService } from '../services/matching-service.js';
import { coordinateMapper } from '../services/coordinate-mapper.js';
import { eventBus } from '../services/event-bus.js';
import { createPanelResizer } from '../utils/panel-resizer.js';
import { DocumentViewer } from '../components/document-viewer.js';

export class BlockConfigurationScreen extends BaseScreen {
  constructor() {
    super();
    this._blockId = '';
    this._blockName = '';
    this._divisionName = '';
    this._productName = '';
    this._sheets = [];
    this._selectedSheetIdx = 0;
    this._mappedItems = [];
    this._highlightedItemId = null;
    this._saveConfirmTimer = null;
    this._rightPanelResizer = null;
    this._viewer = null;
    this._popoverHideTimer = null;
    this._isPopoverHovered = false;
  }

  render() {
    this._loadBlockInfo();

    const container = el('div', { className: 'block-config' });

    // Compact header: breadcrumb + legend in single row
    const header = el('div', { className: 'block-config-header' },
      el('div', { className: 'breadcrumb' },
        el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.DivisionSelection) }, this._divisionName),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.ProductSelection) }, this._productName),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.MainHub) }, 'Configure'),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item active' }, this._blockName),
        el('span', { className: 'breadcrumb-hint' }, '— Select items to include')
      ),
      el('div', { className: 'block-config-legend' },
        el('div', { className: 'legend-item' },
          el('div', { className: 'legend-swatch optional' }),
          'Optional'
        ),
        el('div', { className: 'legend-item' },
          el('div', { className: 'legend-swatch selected-legend' }, '\u2713'),
          'Selected'
        ),
        el('div', { className: 'legend-item' },
          el('div', { className: 'legend-swatch mandatory-legend' }, '\uD83D\uDD12'),
          'Mandatory'
        )
      )
    );

    // Split panel
    const split = el('div', { className: 'block-config-split' });

    // Left panel: tabs + document viewer
    const leftPanel = el('div', { className: 'block-config-left' });
    this._tabsContainer = el('div', { className: 'sheet-tabs' });
    this._viewerContainer = el('div', { className: 'block-config-viewer' });
    leftPanel.append(this._tabsContainer, this._viewerContainer);

    // Right panel: selection list
    const rightPanel = el('div', { className: 'block-config-right' });
    this._itemCountEl = el('div', { className: 'selection-panel-count' }, '0 items on this sheet');
    this._collapseBtn = el('button', {
      className: 'panel-collapse-btn',
      title: 'Collapse panel',
      onClick: () => this._toggleRightPanel()
    }, '\u00BB');
    const panelHeader = el('div', { className: 'selection-panel-header' },
      el('div', { className: 'selection-panel-header-top' },
        el('div', { className: 'selection-panel-title' }, 'Item Selection'),
        this._collapseBtn
      ),
      this._itemCountEl
    );
    this._selectionList = el('div', { className: 'selection-list' });
    this._summaryEl = el('div', { className: 'selection-panel-summary' }, '');
    rightPanel.append(panelHeader, this._selectionList, this._summaryEl);

    // Detail popover (appears on hover, positioned left of right panel)
    this._detailPopover = el('div', {
      className: 'item-detail-popover',
      onMouseenter: () => { this._isPopoverHovered = true; clearTimeout(this._popoverHideTimer); },
      onMouseleave: () => { this._isPopoverHovered = false; this._scheduleHidePopover(); }
    });
    this._detailPopover.style.display = 'none';

    split.append(leftPanel, rightPanel, this._detailPopover);

    // Floating action buttons (positioned inside split panel)
    this._saveConfirmEl = el('span', { className: 'save-confirmation' }, '\u2713 Saved');

    const backBtn = el('div', { className: 'floating-btn floating-btn-back' },
      el('button', {
        className: 'btn btn-secondary',
        onClick: () => navigationService.navigateTo(Screen.MainHub)
      }, '\u2190 Back'),
      this._saveConfirmEl
    );

    const rightBtns = el('div', { className: 'floating-btn floating-btn-right' },
      el('button', {
        className: 'btn btn-secondary',
        onClick: () => this._onSave()
      }, 'Save'),
      el('button', {
        className: 'btn btn-primary',
        onClick: () => this._onSaveAndContinue()
      }, 'Save & Continue \u2192')
    );

    split.append(backBtn, rightBtns);

    container.append(header, split);
    return container;
  }

  onMount() {
    this._loadSheets();
    this._restoreSavedSelections();
    if (this._sheets.length > 0) {
      this._selectSheet(0);
    }

    // Set up right panel resizer
    const rightPanel = this._container?.querySelector('.block-config-right');
    if (rightPanel) {
      this._rightPanelResizer = createPanelResizer({
        panel: rightPanel,
        edge: 'left',
        minWidth: 120,
        maxWidth: 500,
        collapseThreshold: 80,
        collapsedClass: 'block-config-right-collapsed',
        defaultWidth: rightPanel.offsetWidth || 300,
        onResize: () => {}
      });
    }

    // Auto-compact the app header on this screen; expand on hover, shrink on leave
    this._appHeader = document.getElementById('app-header');
    if (this._appHeader) {
      this._appHeader.classList.add('header-compact');
      this._headerEnter = () => this._appHeader.classList.remove('header-compact');
      this._headerLeave = () => this._appHeader.classList.add('header-compact');
      this._appHeader.addEventListener('mouseenter', this._headerEnter);
      this._appHeader.addEventListener('mouseleave', this._headerLeave);
    }
    // Also hide progress bar on config screen
    this._progressBar = document.querySelector('.progress-container');
    if (this._progressBar) {
      this._progressBar.style.display = 'none';
    }

    // Auto-collapse both sidebars on Step 5
    eventBus.emit('sidebar:collapse');
  }

  onUnmount() {
    // Remove hover listeners and restore header
    if (this._appHeader) {
      this._appHeader.removeEventListener('mouseenter', this._headerEnter);
      this._appHeader.removeEventListener('mouseleave', this._headerLeave);
      this._appHeader.classList.remove('header-compact');
    }
    if (this._progressBar) {
      this._progressBar.style.display = '';
    }
    // Restore left sidebar
    eventBus.emit('sidebar:expand');
    // Clear timers
    clearTimeout(this._popoverHideTimer);
    clearTimeout(this._saveConfirmTimer);
  }

  _toggleRightPanel() {
    const rightPanel = this._container?.querySelector('.block-config-right');
    if (!rightPanel) return;

    const isCollapsed = rightPanel.classList.toggle('block-config-right-collapsed');
    this._collapseBtn.textContent = isCollapsed ? '\u00AB' : '\u00BB';
    this._collapseBtn.title = isCollapsed ? 'Expand panel' : 'Collapse panel';
  }

  _loadBlockInfo() {
    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const blockId = navigationService.selectedPfdBlockId;

    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    this._divisionName = division?.name || 'Division';

    const products = catalogService.getProducts(divisionId);
    const product = products.find(p => p.id === productId);
    this._productName = product?.name || 'Product';

    const blocks = catalogService.getPfdBlocks(divisionId, productId);
    const block = blocks.find(b => b.id === blockId);
    this._blockName = block?.name || 'Unknown Block';
    this._blockId = blockId || '';
  }

  _loadSheets() {
    const sheetNames = mockDataService.getSheetNames(this._blockId);
    this._sheets = [];

    for (let i = 0; i < sheetNames.length; i++) {
      const sheetName = sheetNames[i];
      const excelItems = mockDataService.getExcelItems(this._blockId, sheetName);
      const textractResult = mockDataService.getSheetTextractResults(this._blockId, sheetName);
      const matchResult = matchingService.matchItems(excelItems, textractResult);

      const items = [];

      // Matched items
      for (const matched of matchResult.matchedItems) {
        items.push({
          id: matched.itemId,
          text: matched.itemName,
          matchText: matched.matchText || '',
          isMandatory: matched.isMandatory,
          isSelected: matched.isMandatory,
          confidence: matched.confidence,
          boundingBox: matched.boundingBox,
          isHighlighted: false,
          sheetName: sheetName
        });
      }

      // Unmatched items
      for (const unmatched of matchResult.unmatchedExcelItems) {
        items.push({
          id: unmatched.itemId,
          text: unmatched.itemName,
          matchText: unmatched.matchText || '',
          isMandatory: unmatched.isMandatory,
          isSelected: unmatched.isMandatory,
          confidence: 0,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          isHighlighted: false,
          sheetName: sheetName
        });
      }

      this._sheets.push({
        sheetName,
        displayName: sheetName,
        items
      });
    }

    // Render tabs
    this._renderTabs();
  }

  _restoreSavedSelections() {
    const savedConfig = sessionStateService.getBlockConfiguration(this._blockId);
    if (!savedConfig) return;

    for (const sheet of this._sheets) {
      const sheetConfig = savedConfig.sheetConfigurations?.[sheet.sheetName];
      if (sheetConfig) {
        const selectedIds = new Set(sheetConfig.selectedItemIds);
        for (const item of sheet.items) {
          if (!item.isMandatory) {
            item.isSelected = selectedIds.has(item.id);
          }
        }
      }
    }
  }

  _renderTabs() {
    this._tabsContainer.innerHTML = '';
    for (let i = 0; i < this._sheets.length; i++) {
      const sheet = this._sheets[i];
      const tab = el('button', {
        className: `sheet-tab${i === this._selectedSheetIdx ? ' active' : ''}`,
        onClick: () => this._selectSheet(i)
      }, sheet.displayName);
      this._tabsContainer.appendChild(tab);
    }
  }

  _selectSheet(idx) {
    this._selectedSheetIdx = idx;
    this._mappedItems = this._sheets[idx]?.items || [];

    // Update tab active states
    this._tabsContainer.querySelectorAll('.sheet-tab').forEach((tab, i) => {
      tab.classList.toggle('active', i === idx);
    });

    this._renderViewer();
    this._renderSelectionList();
    this._updateSummary();
  }

  _renderViewer() {
    this._viewerContainer.innerHTML = '';

    // Build content: image + checkbox overlay
    const content = el('div', {
      style: { position: 'relative', display: 'inline-block' }
    });

    const currentSheet = this._sheets[this._selectedSheetIdx];
    const sheetImageSrc = this._getSheetImageSrc();

    const img = document.createElement('img');
    img.src = sheetImageSrc;
    img.style.display = 'block';
    img.alt = `${this._blockName} - ${currentSheet?.displayName || ''}`;

    this._checkboxOverlay = el('div', {
      style: { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' }
    });

    const setupOverlay = (imgWidth, imgHeight) => {
      this._checkboxOverlay.style.width = `${imgWidth}px`;
      this._checkboxOverlay.style.height = `${imgHeight}px`;
      this._renderCheckboxOverlay(imgWidth, imgHeight);
    };

    img.onload = () => {
      setupOverlay(img.naturalWidth, img.naturalHeight);
    };

    if (img.complete && img.naturalWidth > 0) {
      setupOverlay(img.naturalWidth, img.naturalHeight);
    }

    content.append(img, this._checkboxOverlay);

    // Wrap in DocumentViewer for zoom/pan
    this._viewer = new DocumentViewer();
    const viewerEl = this._viewer.create({ content });
    this._viewerContainer.appendChild(viewerEl);
  }

  /**
   * Get sheet image path for the current block and active tab.
   */
  _getSheetImageSrc() {
    return `assets/images/sheet-${this._blockId}-${this._selectedSheetIdx}.png`;
  }

  _renderCheckboxOverlay(docWidth, docHeight) {
    this._checkboxOverlay.innerHTML = '';

    for (const item of this._mappedItems) {
      if (item.boundingBox.x === 0 && item.boundingBox.y === 0) continue;

      const coords = coordinateMapper.mapToViewerCoordinates(
        item.boundingBox, docWidth, docHeight, 1.0
      );

      let stateClass = '';
      if (item.isMandatory) stateClass = 'mandatory';
      else if (item.isSelected) stateClass = 'selected';

      const cbEl = el('div', {
        className: `checkbox-overlay-item ${stateClass}${item.isHighlighted ? ' highlighted' : ''}`,
        style: {
          left: `${coords.checkboxX}px`,
          top: `${coords.checkboxY - 11}px`,
          pointerEvents: 'auto'
        },
        dataset: { itemId: item.id },
        onClick: () => this._toggleItem(item),
        onMouseenter: () => this._highlightItem(item.id, true),
        onMouseleave: () => this._highlightItem(item.id, false)
      },
        el('div', { className: 'highlight-ring' }),
        el('div', { className: 'outer-ring' }),
        el('div', { className: 'checkbox-inner' },
          el('span', { className: 'check-icon' }, '\u2713'),
          el('span', { className: 'lock-icon' }, '\uD83D\uDD12')
        ),
        el('div', { className: 'checkbox-tooltip' },
          el('div', { className: 'checkbox-tooltip-name' }, item.text),
          item.isMandatory ? el('div', { className: 'checkbox-tooltip-mandatory' }, 'Required - cannot be deselected') : null,
          item.confidence < 80 && item.confidence > 0 ? el('div', { className: 'checkbox-tooltip-confidence' }, `Confidence: ${Math.round(item.confidence)}%`) : null
        )
      );

      this._checkboxOverlay.appendChild(cbEl);
    }
  }

  _renderSelectionList() {
    this._selectionList.innerHTML = '';

    for (const item of this._mappedItems) {
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
        onClick: () => this._toggleItem(item),
        onMouseenter: (e) => { clearTimeout(this._popoverHideTimer); this._highlightItem(item.id, true); this._showDetailPopover(item, e.currentTarget); },
        onMouseleave: () => { this._highlightItem(item.id, false); this._scheduleHidePopover(); }
      },
        el('div', { className: checkboxClass }, checkIcon),
        el('div', {},
          el('div', { className: 'selection-item-name' }, item.text),
          el('div', { className: 'selection-item-id' }, item.id)
        ),
        item.isMandatory ? el('div', { className: 'badge badge-mandatory' }, 'Required') : null
      );

      this._selectionList.appendChild(itemEl);
    }

    this._itemCountEl.textContent = `${this._mappedItems.length} items on this sheet`;
  }

  _toggleItem(item) {
    if (item.isMandatory) return;
    item.isSelected = !item.isSelected;
    this._renderSelectionList();
    // Re-render checkboxes using actual image dimensions
    const img = this._viewerContainer.querySelector('img');
    if (img && img.naturalWidth > 0) {
      this._renderCheckboxOverlay(img.naturalWidth, img.naturalHeight);
      // Re-apply zoom transform on the overlay after re-render
      if (this._viewer) {
        this._viewer.refreshZoom();
      }
    }
    this._updateSummary();
  }

  _highlightItem(itemId, highlighted) {
    // Update model
    for (const item of this._mappedItems) {
      item.isHighlighted = item.id === itemId ? highlighted : false;
    }

    // Update list item highlighting
    this._selectionList.querySelectorAll('.selection-item').forEach(el => {
      el.classList.toggle('highlighted', el.dataset.itemId === itemId && highlighted);
    });

    // Update checkbox overlay highlighting
    if (this._checkboxOverlay) {
      this._checkboxOverlay.querySelectorAll('.checkbox-overlay-item').forEach(el => {
        el.classList.toggle('highlighted', el.dataset.itemId === itemId && highlighted);
      });
    }
  }

  _showDetailPopover(item, targetEl) {
    if (!this._detailPopover) return;

    const status = item.isMandatory ? 'Mandatory' : (item.isSelected ? 'Selected' : 'Optional');
    const statusClass = item.isMandatory ? 'mandatory' : (item.isSelected ? 'selected' : 'optional');
    const confidenceText = item.confidence > 0 ? `${Math.round(item.confidence)}%` : 'N/A';
    const confidenceClass = item.confidence >= 90 ? 'high' : (item.confidence >= 70 ? 'medium' : 'low');
    const hasLocation = item.boundingBox.x !== 0 || item.boundingBox.y !== 0;

    // Determine component type from sheet or ID prefix
    const typeMap = {
      'P&ID': 'P&ID Component',
      'Instrument List': 'Instrument',
      'Line List': 'Line / Pipe',
      'Equipment List': 'Equipment'
    };
    const componentType = typeMap[item.sheetName] || 'Component';

    // Generate mock spec properties based on component type
    const specs = this._getComponentSpecs(item, componentType);

    // Build confidence gauge bar
    const confPct = Math.max(0, Math.min(100, Math.round(item.confidence)));
    const gaugeBar = el('div', { className: 'popover-gauge' },
      el('div', { className: 'popover-gauge-label' },
        el('span', {}, 'Detection Confidence'),
        el('span', { className: `confidence-val ${confidenceClass}` }, confidenceText)
      ),
      el('div', { className: 'popover-gauge-track' },
        el('div', { className: `popover-gauge-fill ${confidenceClass}`, style: { width: `${confPct}%` } })
      )
    );

    // Build mini bar chart for analysis metrics
    const metrics = this._getAnalysisMetrics(item);
    const chartBars = metrics.map(m =>
      el('div', { className: 'popover-chart-col' },
        el('div', { className: 'popover-chart-bar-wrap' },
          el('div', { className: `popover-chart-bar ${m.colorClass}`, style: { height: `${m.value}%` } })
        ),
        el('div', { className: 'popover-chart-label' }, m.label)
      )
    );
    const chart = el('div', { className: 'popover-chart' },
      el('div', { className: 'popover-section-title' }, 'Analysis Metrics'),
      el('div', { className: 'popover-chart-bars' }, ...chartBars)
    );

    this._detailPopover.innerHTML = '';
    this._detailPopover.append(
      el('div', { className: 'detail-popover-header' },
        el('div', {},
          el('div', { className: 'detail-popover-name' }, item.text),
          el('div', { className: 'detail-popover-subtitle' }, componentType)
        ),
        el('div', { className: `detail-popover-status ${statusClass}` }, status)
      ),
      el('div', { className: 'detail-popover-body' },
        // Properties section
        el('div', { className: 'popover-section' },
          el('div', { className: 'popover-section-title' }, 'Identification'),
          this._propRow('Item ID', item.id),
          this._propRow('Tag / Ref', item.matchText || '-'),
          this._propRow('Sheet', item.sheetName),
          this._propRow('Location', hasLocation
            ? `X: ${(item.boundingBox.x * 100).toFixed(1)}%  Y: ${(item.boundingBox.y * 100).toFixed(1)}%`
            : 'Not detected')
        ),
        // Specs section
        el('div', { className: 'popover-section' },
          el('div', { className: 'popover-section-title' }, 'Specifications'),
          ...specs.map(s => this._propRow(s.label, s.value))
        ),
        // Confidence gauge
        gaugeBar,
        // Analysis bar chart
        chart
      )
    );

    // Position popover to the left of the right panel, centered vertically on hovered item
    const splitRect = this._detailPopover.parentElement.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const rightPanel = this._container?.querySelector('.block-config-right');
    const rightRect = rightPanel?.getBoundingClientRect();

    this._detailPopover.style.display = 'block';

    // Center popover vertically relative to the hovered item
    const popoverHeight = this._detailPopover.offsetHeight;
    const targetCenter = targetRect.top + targetRect.height / 2 - splitRect.top;
    let topPos = targetCenter - popoverHeight / 2;

    // Keep within split bounds
    if (topPos + popoverHeight > splitRect.height - 8) {
      topPos = splitRect.height - popoverHeight - 8;
    }
    if (topPos < 8) topPos = 8;

    this._detailPopover.style.top = `${topPos}px`;
    // Position to the left of the right panel
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

  _hideDetailPopover() {
    clearTimeout(this._popoverHideTimer);
    this._isPopoverHovered = false;
    if (this._detailPopover) {
      this._detailPopover.style.display = 'none';
    }
  }

  /** Generate mock specification properties based on component type */
  _getComponentSpecs(item, componentType) {
    // Seed a simple deterministic hash from item ID for consistent mock values
    const hash = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    if (componentType === 'Instrument') {
      const ranges = ['0-100 PSI', '0-500\u00B0F', '0-10 m', '4-20 mA', '0-300 PSI'];
      const classes = ['Class A', 'Class B', 'Class C'];
      return [
        { label: 'Range', value: ranges[hash % ranges.length] },
        { label: 'Accuracy', value: `\u00B1${(0.1 + (hash % 5) * 0.15).toFixed(2)}%` },
        { label: 'Class', value: classes[hash % classes.length] },
        { label: 'Signal', value: hash % 2 === 0 ? '4-20 mA' : 'HART' }
      ];
    } else if (componentType === 'Line / Pipe') {
      const sizes = ['2"', '3"', '4"', '6"', '8"'];
      const materials = ['CS A106 Gr.B', 'SS 304L', 'SS 316L', 'CS A53 Gr.B'];
      const schedules = ['Sch 40', 'Sch 80', 'Sch 160', 'Sch STD'];
      return [
        { label: 'Size', value: sizes[hash % sizes.length] },
        { label: 'Material', value: materials[hash % materials.length] },
        { label: 'Schedule', value: schedules[hash % schedules.length] },
        { label: 'Insulation', value: hash % 3 === 0 ? 'Hot (H)' : hash % 3 === 1 ? 'Cold (C)' : 'None' }
      ];
    } else if (componentType === 'Equipment') {
      const pressures = ['150#', '300#', '600#'];
      const materials = ['SA-516 Gr.70', 'SA-240 304', 'SA-387 Gr.11'];
      return [
        { label: 'Design Pres.', value: `${50 + (hash % 8) * 50} PSI` },
        { label: 'Design Temp.', value: `${200 + (hash % 6) * 75}\u00B0F` },
        { label: 'Rating', value: pressures[hash % pressures.length] },
        { label: 'Material', value: materials[hash % materials.length] }
      ];
    } else {
      // P&ID Component
      const sizes = ['2"', '4"', '6"', '8"', '10"'];
      const ratings = ['150#', '300#', '600#'];
      return [
        { label: 'Size', value: sizes[hash % sizes.length] },
        { label: 'Rating', value: ratings[hash % ratings.length] },
        { label: 'Design Pres.', value: `${100 + (hash % 10) * 50} PSI` },
        { label: 'Design Temp.', value: `${250 + (hash % 8) * 50}\u00B0F` }
      ];
    }
  }

  /** Generate analysis metrics for bar chart */
  _getAnalysisMetrics(item) {
    const hash = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return [
      { label: 'OCR', value: Math.min(100, Math.max(20, Math.round(item.confidence))), colorClass: 'bar-ocr' },
      { label: 'Match', value: item.confidence > 0 ? Math.min(100, Math.round(item.confidence * 0.95 + (hash % 10))) : 15, colorClass: 'bar-match' },
      { label: 'Valid', value: item.isMandatory ? 100 : Math.min(100, 60 + (hash % 40)), colorClass: 'bar-valid' },
      { label: 'Compl', value: item.isSelected ? Math.min(100, 75 + (hash % 25)) : 30, colorClass: 'bar-compl' }
    ];
  }

  _propRow(label, value) {
    const valEl = typeof value === 'string'
      ? el('div', { className: 'detail-prop-value' }, value)
      : el('div', { className: 'detail-prop-value' }, value);
    return el('div', { className: 'detail-prop-row' },
      el('div', { className: 'detail-prop-label' }, label),
      valEl
    );
  }

  _updateSummary() {
    const mandatory = this._mappedItems.filter(i => i.isMandatory).length;
    const optional = this._mappedItems.filter(i => !i.isMandatory).length;
    const optionalSelected = this._mappedItems.filter(i => !i.isMandatory && i.isSelected).length;
    this._summaryEl.textContent = `${mandatory} mandatory \u2713 | ${optionalSelected} of ${optional} optional selected`;
  }

  _onSave() {
    this._saveConfiguration();

    // Show confirmation
    this._saveConfirmEl.classList.add('visible');
    clearTimeout(this._saveConfirmTimer);
    this._saveConfirmTimer = setTimeout(() => {
      this._saveConfirmEl.classList.remove('visible');
    }, 2500);
  }

  _onSaveAndContinue() {
    this._saveConfiguration();

    const nextBlockId = sessionStateService.getNextPendingBlockId();
    if (nextBlockId) {
      navigationService.setSelectedPfdBlock(nextBlockId);
      navigationService.navigateTo(Screen.BlockConfiguration);
    } else {
      navigationService.navigateTo(Screen.MainHub);
    }
  }

  _saveConfiguration() {
    const sheetConfigurations = this._sheets.map(sheet => ({
      sheetName: sheet.sheetName,
      selectedItemIds: sheet.items.filter(i => i.isSelected).map(i => i.id)
    }));

    sessionStateService.saveBlockConfiguration(this._blockId, this._blockName, sheetConfigurations);
  }
}
