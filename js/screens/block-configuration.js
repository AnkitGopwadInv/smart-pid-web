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
  }

  render() {
    this._loadBlockInfo();

    const container = el('div', { className: 'block-config' });

    // Header with breadcrumb + legend
    const header = el('div', { className: 'block-config-header' },
      el('div', { className: 'breadcrumb' },
        el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.DivisionSelection) }, this._divisionName),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.ProductSelection) }, this._productName),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.MainHub) }, 'Configure'),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item active' }, this._blockName)
      ),
      el('div', { className: 'block-config-header-row' },
        el('div', {},
          el('h1', { className: 'screen-title' }, this._blockName),
          el('p', { className: 'screen-subtitle' }, 'Select items to include from each sheet')
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
    const panelHeader = el('div', { className: 'selection-panel-header' },
      el('div', { className: 'selection-panel-title' }, 'Item Selection'),
      this._itemCountEl
    );
    this._selectionList = el('div', { className: 'selection-list' });
    this._summaryEl = el('div', { className: 'selection-panel-summary' }, '');
    rightPanel.append(panelHeader, this._selectionList, this._summaryEl);

    split.append(leftPanel, rightPanel);

    // Footer
    this._saveConfirmEl = el('span', { className: 'save-confirmation' }, '\u2713 Saved');
    const footer = el('div', { className: 'block-config-footer screen-footer' },
      el('div', { className: 'block-config-footer-left' },
        el('button', {
          className: 'btn btn-secondary',
          onClick: () => navigationService.navigateTo(Screen.MainHub),
          style: { minWidth: '100px' }
        }, '\u2190 Back'),
        this._saveConfirmEl
      ),
      el('div', { className: 'block-config-footer-right' },
        el('button', {
          className: 'btn btn-secondary',
          onClick: () => this._onSave(),
          style: { minWidth: '80px' }
        }, 'Save'),
        el('button', {
          className: 'btn btn-primary',
          onClick: () => this._onSaveAndContinue(),
          style: { minWidth: '140px' }
        }, 'Save & Continue \u2192')
      )
    );

    container.append(header, split, footer);
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
          isMandatory: matched.isMandatory,
          isSelected: matched.isMandatory,
          confidence: matched.confidence,
          boundingBox: matched.boundingBox,
          isHighlighted: false
        });
      }

      // Unmatched items
      for (const unmatched of matchResult.unmatchedExcelItems) {
        items.push({
          id: unmatched.itemId,
          text: unmatched.itemName,
          isMandatory: unmatched.isMandatory,
          isSelected: unmatched.isMandatory,
          confidence: 0,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          isHighlighted: false
        });
      }

      this._sheets.push({
        sheetName,
        displayName: `Sheet ${i + 1}`,
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

    const img = document.createElement('img');
    img.src = `assets/images/sheet-${this._blockId}.png`;
    img.style.display = 'block';
    img.alt = `${this._blockName} - ${this._sheets[this._selectedSheetIdx]?.displayName || ''}`;

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
        onMouseenter: () => this._highlightItem(item.id, true),
        onMouseleave: () => this._highlightItem(item.id, false)
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
