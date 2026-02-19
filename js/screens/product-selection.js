/**
 * Screen 2: Product Selection
 * Port of Views/ProductSelectionView.xaml + ViewModels/ProductSelectionViewModel.cs
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';
import { getIconSvg, getIconColor } from '../models/catalog.js';

export class ProductSelectionScreen extends BaseScreen {
  constructor() {
    super();
    this._selectedProductId = null;
    this._nextBtn = null;
  }

  render() {
    const divisionId = navigationService.selectedDivisionId;
    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    const divisionName = division?.name || 'Division';
    const iconColor = getIconColor(division?.icon);

    const container = el('div', { className: 'screen' });

    // Breadcrumb + header
    const header = el('div', { className: 'screen-header' },
      el('div', { className: 'breadcrumb' },
        el('span', { className: 'breadcrumb-item' }, divisionName),
        el('span', { className: 'breadcrumb-separator' }, '\u203A'),
        el('span', { className: 'breadcrumb-item active' }, 'Select Product')
      ),
      el('div', { className: 'product-header-icon' },
        el('span', { htmlContent: getIconSvg(division?.icon, iconColor), style: { width: '28px', height: '28px', display: 'inline-flex' } }),
        el('h1', { className: 'screen-title', style: { marginBottom: '0' } }, 'Select Product')
      ),
      el('p', { className: 'screen-subtitle' },
        `Choose a product from the `,
        el('strong', {}, divisionName),
        ` division`
      )
    );

    // Product list
    this._listContainer = el('div', { className: 'product-list-container screen-body' });
    this._list = el('div', { className: 'product-list' });
    this._listContainer.appendChild(this._list);

    // Footer
    this._nextBtn = el('button', {
      className: 'btn btn-primary',
      disabled: 'disabled',
      onClick: () => this._onNext(),
      style: { minWidth: '120px' }
    }, 'Next \u2192');

    const backBtn = el('button', {
      className: 'btn btn-secondary',
      onClick: () => navigationService.navigateTo(Screen.DivisionSelection),
      style: { minWidth: '100px' }
    }, '\u2190 Back');

    const footer = el('div', { className: 'screen-footer' }, backBtn, this._nextBtn);

    container.append(header, this._listContainer, footer);
    return container;
  }

  onMount() {
    this._loadProducts();
  }

  _loadProducts() {
    const divisionId = navigationService.selectedDivisionId;
    if (!divisionId) {
      navigationService.navigateTo(Screen.DivisionSelection);
      return;
    }

    const products = catalogService.getProducts(divisionId);
    this._list.innerHTML = '';

    if (products.length === 0) {
      this._list.innerHTML = `<div class="empty-state">
        <div class="empty-state-title">No products available</div>
        <div class="empty-state-text">This division has no products configured.</div>
      </div>`;
      return;
    }

    for (const product of products) {
      const blockCount = product.pfdBlocks?.length || 0;
      const item = el('div', {
        className: 'product-item',
        tabindex: '0',
        role: 'option',
        dataset: { productId: product.id },
        onClick: () => this._selectProduct(product.id),
        onKeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._selectProduct(product.id);
          }
        }
      },
        el('div', { className: 'product-radio' },
          el('div', { className: 'product-radio-inner' })
        ),
        el('div', { className: 'product-name' }, product.name),
        el('div', { className: 'product-block-count' }, `${blockCount} PFD Blocks`)
      );
      this._list.appendChild(item);
    }
  }

  _selectProduct(productId) {
    this._list.querySelectorAll('.product-item').forEach(i => i.classList.remove('selected'));
    const item = this._list.querySelector(`[data-product-id="${productId}"]`);
    if (item) item.classList.add('selected');
    this._selectedProductId = productId;
    this._nextBtn.disabled = false;
  }

  _onNext() {
    if (!this._selectedProductId) return;
    navigationService.setSelectedProduct(this._selectedProductId);
    navigationService.navigateTo(Screen.PfdBlockSelection);
  }
}
