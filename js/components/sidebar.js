/**
 * Sidebar component - workflow step navigation
 * ESP Configuration UI style with resizable + collapsible support.
 * Drag right edge to resize. When collapsed, shows only step number icons.
 */
import { el } from '../utils/dom.js';
import { Screen, navigationService } from '../services/navigation-service.js';
import { catalogService } from '../services/catalog-service.js';
import { sessionStateService } from '../services/session-state-service.js';
import { eventBus } from '../services/event-bus.js';
import { defaultWorkflowSteps } from '../models/workflow-step.js';
import { createPanelResizer } from '../utils/panel-resizer.js';

export class Sidebar {
  constructor() {
    this._steps = defaultWorkflowSteps.map(s => ({ ...s }));
    this._container = null;
    this._contentEl = null;
    this._resizer = null;
    this._collapseBtn = null;
  }

  render(container) {
    this._container = container;
    container.innerHTML = '';

    // Collapse/expand toggle button
    this._collapseBtn = el('button', {
      className: 'sidebar-collapse-btn',
      title: 'Collapse sidebar',
      onClick: () => this._resizer?.toggle()
    }, '«');

    // Sidebar header with gradient navy bg
    const header = el('div', { className: 'sidebar-header' },
      el('h3', {}, 'Configuration Steps'),
      this._collapseBtn
    );

    // Sidebar content
    this._contentEl = el('div', { className: 'sidebar-content' });
    this._renderSteps();

    container.append(header, this._contentEl);

    // Set up resizer on right edge
    this._resizer = createPanelResizer({
      panel: container,
      edge: 'right',
      minWidth: 80,
      maxWidth: 450,
      collapseThreshold: 70,
      collapsedClass: 'sidebar-collapsed',
      defaultWidth: 260,
      onResize: (width, collapsed) => {
        this._collapseBtn.textContent = collapsed ? '»' : '«';
        this._collapseBtn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
      }
    });

    // Listen for screen changes & configuration changes
    eventBus.on('screen:changed', () => this._onStateChanged());
    eventBus.on('configuration:changed', () => this._onStateChanged());
  }

  _onStateChanged() {
    const screenOrder = [
      Screen.DivisionSelection,
      Screen.ProductSelection,
      Screen.PfdBlockSelection,
      Screen.MainHub,
      Screen.BlockConfiguration
    ];

    const screen = navigationService.currentScreen;
    const currentIdx = screenOrder.indexOf(screen);

    for (let i = 0; i < this._steps.length; i++) {
      this._steps[i].isActive = i === currentIdx;
      this._steps[i].isCompleted = i < currentIdx;
    }

    this._renderSteps();
    this._scrollToActive();
  }

  _renderSteps() {
    this._contentEl.innerHTML = '';

    for (const step of this._steps) {
      const stepEl = this._createStepElement(step);
      this._contentEl.appendChild(stepEl);
    }
  }

  _scrollToActive() {
    const activeEl = this._contentEl.querySelector('.sidebar-step-header.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  _createStepElement(step) {
    const stepContainer = el('div', { className: 'sidebar-step' });

    let stateClass = '';
    if (step.isCompleted) stateClass = 'completed';
    else if (step.isActive) stateClass = 'active';

    const numberContent = step.isCompleted ? '\u2713' : String(step.stepNumber);

    let statusText = '';
    if (step.isCompleted) statusText = '✓';
    else if (step.isActive) statusText = '◉';

    // Step header
    const headerEl = el('div', {
      className: `sidebar-step-header ${stateClass}`,
      onClick: () => {
        // If collapsed, clicking should also expand
        if (this._container.classList.contains('sidebar-collapsed')) {
          this._resizer?.toggle();
        }
        if (step.isNavigable) {
          navigationService.navigateTo(step.screen);
        }
      },
      title: step.label,
      style: {
        cursor: step.isNavigable ? 'pointer' : 'default',
        opacity: step.isNavigable ? '1' : '0.6'
      }
    },
      el('div', { className: 'sidebar-step-number' }, numberContent),
      el('div', { className: 'sidebar-step-title' }, step.label),
      statusText ? el('span', { className: 'sidebar-step-status' }, statusText) : null
    );

    stepContainer.appendChild(headerEl);

    // Expandable content
    if (step.isCompleted || step.isActive) {
      const contentEl = this._buildStepContent(step);
      if (contentEl) {
        stepContainer.appendChild(contentEl);
      }
    }

    return stepContainer;
  }

  _buildStepContent(step) {
    const contentEl = el('div', { className: 'sidebar-step-content show' });
    let hasContent = false;

    switch (step.screen) {
      case Screen.DivisionSelection:
        hasContent = this._buildDivisionContent(contentEl);
        break;
      case Screen.ProductSelection:
        hasContent = this._buildProductContent(contentEl);
        break;
      case Screen.PfdBlockSelection:
        hasContent = this._buildBlockSelectionContent(contentEl);
        break;
      case Screen.MainHub:
        hasContent = this._buildMainHubContent(contentEl);
        break;
      case Screen.BlockConfiguration:
        hasContent = this._buildBlockConfigContent(contentEl);
        break;
    }

    return hasContent ? contentEl : null;
  }

  _buildDivisionContent(container) {
    const divisionId = navigationService.selectedDivisionId;
    if (!divisionId) return false;
    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    if (!division) return false;

    container.appendChild(
      el('div', { className: 'sidebar-item' },
        el('span', { className: 'sidebar-item-icon' }, '🏭'),
        el('span', { className: 'sidebar-item-label' }, 'Division:'),
        el('span', { className: 'sidebar-item-value' }, division.name)
      )
    );
    return true;
  }

  _buildProductContent(container) {
    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    if (!productId) return false;
    const products = catalogService.getProducts(divisionId);
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    container.appendChild(
      el('div', { className: 'sidebar-item' },
        el('span', { className: 'sidebar-item-icon' }, '📦'),
        el('span', { className: 'sidebar-item-label' }, 'Product:'),
        el('span', { className: 'sidebar-item-value' }, product.name)
      )
    );
    return true;
  }

  _buildBlockSelectionContent(container) {
    const selectedBlockIds = navigationService.selectedPfdBlockIds;
    if (selectedBlockIds.length === 0) return false;

    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const allBlocks = catalogService.getPfdBlocks(divisionId, productId);

    container.appendChild(
      el('div', { className: 'sidebar-item' },
        el('span', { className: 'sidebar-item-icon' }, '📋'),
        el('span', { className: 'sidebar-item-value' }, `${selectedBlockIds.length} Blocks`)
      )
    );

    const subItems = el('div', { className: 'sidebar-subitems' });
    for (const blockId of selectedBlockIds) {
      const block = allBlocks.find(b => b.id === blockId);
      if (block) {
        const isMandatory = block.is_mandatory;
        subItems.appendChild(
          el('div', { className: 'sidebar-subitem' },
            el('span', { className: 'sidebar-subitem-icon' }, isMandatory ? '🔒' : '✅'),
            block.name,
            isMandatory ? el('span', { className: 'sidebar-mandatory-badge' }, 'M') : null
          )
        );
      }
    }
    container.appendChild(subItems);
    return true;
  }

  _buildMainHubContent(container) {
    const selectedBlockIds = navigationService.selectedPfdBlockIds;
    if (selectedBlockIds.length === 0) return false;

    const configured = sessionStateService.configuredBlockCount;
    const total = selectedBlockIds.length;

    container.appendChild(
      el('div', { className: 'sidebar-item' },
        el('span', { className: 'sidebar-item-icon' }, '⚙️'),
        el('span', { className: 'sidebar-item-label' }, 'Progress:'),
        el('span', { className: 'sidebar-item-value' }, `${configured}/${total}`)
      )
    );

    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const allBlocks = catalogService.getPfdBlocks(divisionId, productId);

    const subItems = el('div', { className: 'sidebar-subitems' });
    for (const blockId of selectedBlockIds) {
      const block = allBlocks.find(b => b.id === blockId);
      if (block) {
        const isConfigured = sessionStateService.isBlockConfigured(blockId);
        subItems.appendChild(
          el('div', { className: 'sidebar-subitem' },
            el('span', { className: 'sidebar-subitem-icon' }, isConfigured ? '✅' : '⏳'),
            block.name
          )
        );
      }
    }
    container.appendChild(subItems);
    return true;
  }

  _buildBlockConfigContent(container) {
    const blockId = navigationService.selectedPfdBlockId;
    if (!blockId) return false;

    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const allBlocks = catalogService.getPfdBlocks(divisionId, productId);
    const block = allBlocks.find(b => b.id === blockId);

    container.appendChild(
      el('div', { className: 'sidebar-item' },
        el('span', { className: 'sidebar-item-icon' }, '🔧'),
        el('span', { className: 'sidebar-item-label' }, 'Editing:'),
        el('span', { className: 'sidebar-item-value' }, block?.name || blockId)
      )
    );
    return true;
  }
}
