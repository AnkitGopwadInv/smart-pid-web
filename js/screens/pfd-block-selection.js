/**
 * Screen 3: PFD Block Selection
 * Port of Views/PfdBlockSelectionView.xaml + ViewModels/PfdBlockSelectionViewModel.cs
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';

export class PfdBlockSelectionScreen extends BaseScreen {
  constructor() {
    super();
    this._blocks = [];
    this._continueBtn = null;
    this._selectedCountEl = null;
  }

  render() {
    const divisionId = navigationService.selectedDivisionId;
    const productId = navigationService.selectedProductId;
    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    const products = catalogService.getProducts(divisionId);
    const product = products.find(p => p.id === productId);

    const container = el('div', { className: 'screen' });

    // Header with breadcrumb
    const header = el('div', { className: 'screen-header' },
      el('div', { className: 'breadcrumb' },
        el('span', { className: 'breadcrumb-item' }, division?.name || ''),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item' }, product?.name || ''),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item active' }, 'Select Blocks')
      ),
      el('h1', { className: 'screen-title' }, 'Select PFD Blocks'),
      el('p', { className: 'screen-subtitle' }, 'Choose the blocks you need for your P&ID')
    );

    // Block list container
    const listContainer = el('div', { className: 'block-list-container screen-body' });
    this._list = el('div', { className: 'block-list' });

    this._selectedCountEl = el('span', { className: 'count' }, '0');
    const footerCount = el('div', { className: 'block-selected-footer' },
      'Selected: ', this._selectedCountEl, ' blocks'
    );

    listContainer.append(this._list, footerCount);

    // Footer navigation
    this._continueBtn = el('button', {
      className: 'btn btn-primary',
      disabled: 'disabled',
      onClick: () => this._onContinue(),
      style: { minWidth: '120px' }
    }, 'Continue \u2192');

    const backBtn = el('button', {
      className: 'btn btn-secondary',
      onClick: () => navigationService.navigateTo(Screen.ProductSelection),
      style: { minWidth: '100px' }
    }, '\u2190 Back');

    const footer = el('div', { className: 'screen-footer' }, backBtn, this._continueBtn);

    container.append(header, listContainer, footer);
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
    this._list.innerHTML = '';

    if (pfdBlocks.length === 0) {
      this._list.innerHTML = `<div class="empty-state">
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
      const item = this._createBlockItem(block);
      this._list.appendChild(item);
    }

    this._updateSelectedCount();
  }

  _createBlockItem(block) {
    const checkbox = el('div', {
      className: `block-checkbox${block.isSelected ? ' checked' : ''}`
    }, el('span', { className: 'checkmark' }, '\u2713'));

    const badge = block.isMandatory
      ? el('span', { className: 'badge badge-required' }, 'Required')
      : null;

    const item = el('div', {
      className: `block-item${block.isMandatory ? ' mandatory' : ''}`,
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
    }, checkbox, el('span', { className: 'block-name' }, block.name), badge);

    return item;
  }

  _toggleBlock(block) {
    if (block.isMandatory) return;

    block.isSelected = !block.isSelected;
    const itemEl = this._list.querySelector(`[data-block-id="${block.id}"]`);
    if (itemEl) {
      const cb = itemEl.querySelector('.block-checkbox');
      cb.classList.toggle('checked', block.isSelected);
      itemEl.setAttribute('aria-checked', String(block.isSelected));
    }

    this._updateSelectedCount();
  }

  _updateSelectedCount() {
    const count = this._blocks.filter(b => b.isSelected).length;
    this._selectedCountEl.textContent = String(count);
    this._continueBtn.disabled = count < 1;
  }

  _onContinue() {
    const selectedIds = this._blocks.filter(b => b.isSelected).map(b => b.id);
    navigationService.setSelectedPfdBlocks(selectedIds);
    navigationService.navigateTo(Screen.MainHub);
  }
}
