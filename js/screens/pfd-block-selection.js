/**
 * Screen 3: PFD Block Selection
 * Card-based UI with icons, mandatory lock badges, and toggle selection.
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';

// Block-specific icons
const blockIcons = {
  steam_drum: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="8" rx="8" ry="4"/><path d="M4 8v4c0 2.2 3.6 4 8 4s8-1.8 8-4V8"/><path d="M8 11v3M12 12v3M16 11v3"/></svg>`,
  deaerator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="4" width="14" height="10" rx="2"/><path d="M8 14v6M16 14v6M5 20h14"/><path d="M9 8h6M9 11h4"/></svg>`,
  economizer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v12M11 6v12M15 6v12"/><path d="M3 10h18M3 14h18"/></svg>`,
  chemical_dosing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2h6v6l3 10a2 2 0 01-2 2H8a2 2 0 01-2-2l3-10V2z"/><path d="M9 2h6"/><path d="M7 15h10"/></svg>`,
  bfw_pumps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 5v-3M12 22v-3M5 12H2M22 12h-3"/></svg>`,
  boiler_feed_water_pump: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="6"/><path d="M12 6v12M6 12h12"/><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/></svg>`,
  blowdown_tank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 4h12v2a8 8 0 01-2 5.3V20H8v-8.7A8 8 0 016 6V4z"/><path d="M6 4h12"/><path d="M10 13h4M10 16h4"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>`
};

function getBlockIcon(blockId) {
  return blockIcons[blockId] || blockIcons['default'];
}

export class PfdBlockSelectionScreen extends BaseScreen {
  constructor() {
    super();
    this._blocks = [];
    this._continueBtn = null;
    this._selectedCountEl = null;
    this._totalCountEl = null;
    this._mandatoryCountEl = null;
  }

  render() {
    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    const products = catalogService.getProducts(divisionId);
    const product = products.find(p => p.id === productId);

    const container = el('div', { className: 'screen' });

    // Header - compact
    const header = el('div', { className: 'screen-header compact-header' },
      el('div', { className: 'compact-header-row' },
        el('div', { className: 'breadcrumb' },
          el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.DivisionSelection) }, division?.name || ''),
          el('span', { className: 'breadcrumb-separator' }, '\u203A'),
          el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.ProductSelection) }, product?.name || ''),
          el('span', { className: 'breadcrumb-separator' }, '\u203A'),
          el('span', { className: 'breadcrumb-item active' }, 'Select Blocks')
        ),
        el('h1', { className: 'screen-title' }, 'Select PFD Blocks')
      )
    );

    // Summary bar
    this._selectedCountEl = el('span', { className: 'pfd-summary-value' }, '0');
    this._totalCountEl = el('span', { className: 'pfd-summary-value' }, '0');
    this._mandatoryCountEl = el('span', { className: 'pfd-summary-value' }, '0');

    const summaryBar = el('div', { className: 'pfd-summary-bar' },
      el('div', { className: 'pfd-summary-item' },
        el('span', { className: 'pfd-summary-label' }, 'Selected'),
        this._selectedCountEl
      ),
      el('div', { className: 'pfd-summary-divider' }),
      el('div', { className: 'pfd-summary-item' },
        el('span', { className: 'pfd-summary-label' }, 'Mandatory'),
        this._mandatoryCountEl
      ),
      el('div', { className: 'pfd-summary-divider' }),
      el('div', { className: 'pfd-summary-item' },
        el('span', { className: 'pfd-summary-label' }, 'Total'),
        this._totalCountEl
      )
    );

    // Block grid
    this._grid = el('div', { className: 'pfd-block-grid screen-body' });

    // Block grid wrapper (relative positioned for floating buttons)
    this._gridWrapper = el('div', { className: 'pfd-grid-wrapper' });

    // Floating action buttons (like step 5)
    const backBtn = el('div', { className: 'floating-btn floating-btn-back' },
      el('button', {
        className: 'btn btn-secondary',
        onClick: () => navigationService.navigateTo(Screen.ProductSelection)
      }, '\u2190 Back')
    );

    this._continueBtn = el('button', {
      className: 'btn btn-primary',
      disabled: 'disabled',
      onClick: () => this._onContinue()
    }, 'Continue \u2192');

    const rightBtns = el('div', { className: 'floating-btn pfd-floating-btn-right' },
      this._continueBtn
    );

    this._gridWrapper.append(this._grid, backBtn, rightBtns);

    container.append(header, summaryBar, this._gridWrapper);
    return container;
  }

  onMount() {
    this._loadBlocks();
  }

  _loadBlocks() {
    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;

    if (!divisionId || !productId) {
      navigationService.navigateTo(Screen.ProductSelection);
      return;
    }

    const pfdBlocks = catalogService.getPfdBlocks(divisionId, productId);
    this._grid.innerHTML = '';

    if (pfdBlocks.length === 0) {
      this._grid.innerHTML = `<div class="empty-state">
        <div class="empty-state-title">No PFD blocks available</div>
        <div class="empty-state-text">This product has no blocks configured.</div>
      </div>`;
      return;
    }

    this._blocks = pfdBlocks.map(block => ({
      ...block,
      isMandatory: block.is_mandatory,
      isSelected: block.is_mandatory
    }));

    for (const block of this._blocks) {
      const card = this._createBlockCard(block);
      this._grid.appendChild(card);
    }

    this._updateCounts();
  }

  _createBlockCard(block) {
    const iconSvg = getBlockIcon(block.id);

    const checkbox = el('div', {
      className: `pfd-block-check${block.isSelected ? ' checked' : ''}${block.isMandatory ? ' locked' : ''}`
    },
      block.isMandatory
        ? el('span', { className: 'lock-icon' }, '\uD83D\uDD12')
        : el('span', { className: 'check-icon' }, '\u2713')
    );

    const card = el('div', {
      className: `pfd-block-card compact${block.isMandatory ? ' mandatory' : ''}${block.isSelected ? ' selected' : ''}`,
      tabindex: '0',
      role: 'checkbox',
      'aria-checked': String(block.isSelected),
      dataset: { blockId: block.id },
      onClick: () => this._toggleBlock(block),
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleBlock(block);
        }
      }
    },
      el('div', { className: `pfd-block-icon${block.isMandatory ? ' mandatory' : ''}`, htmlContent: iconSvg }),
      el('div', { className: 'pfd-block-card-body' },
        el('div', { className: 'pfd-block-name' }, block.name),
        block.isMandatory
          ? el('span', { className: 'pfd-block-badge mandatory' }, 'Required')
          : el('span', { className: 'pfd-block-badge optional' }, 'Optional')
      ),
      checkbox
    );

    return card;
  }

  _toggleBlock(block) {
    if (block.isMandatory) return;

    block.isSelected = !block.isSelected;
    const cardEl = this._grid.querySelector(`[data-block-id="${block.id}"]`);
    if (cardEl) {
      cardEl.classList.toggle('selected', block.isSelected);
      cardEl.setAttribute('aria-checked', String(block.isSelected));
      const cb = cardEl.querySelector('.pfd-block-check');
      cb.classList.toggle('checked', block.isSelected);
    }

    this._updateCounts();
  }

  _updateCounts() {
    const selected = this._blocks.filter(b => b.isSelected).length;
    const mandatory = this._blocks.filter(b => b.isMandatory).length;
    const total = this._blocks.length;

    this._selectedCountEl.textContent = String(selected);
    this._mandatoryCountEl.textContent = String(mandatory);
    this._totalCountEl.textContent = String(total);
    this._continueBtn.disabled = selected < 1;
  }

  _onContinue() {
    const selectedIds = this._blocks.filter(b => b.isSelected).map(b => b.id);
    navigationService.setSelectedPfdBlocks(selectedIds);
    navigationService.navigateTo(Screen.MainHub);
  }
}
