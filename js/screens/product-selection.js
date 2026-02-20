/**
 * Screen 2: Product Selection
 * Card-based UI with icons. Auto-redirects on selection.
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';
import { getIconSvg, getIconColor } from '../models/catalog.js';

// Product-specific icons as inline SVGs
const productIcons = {
  'biomass-fired-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l2-4 2 4-2 4-2-4zm4-2l2-4 2 4-2 4-2-4z"/></svg>`,
  'fixed-plate-afbc-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 10v8M11 10v8M15 10v8"/></svg>`,
  'spent-wash-fired-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h14l-2 18H7L5 3z"/><path d="M8 8h8M9 13h6"/></svg>`,
  'waste-to-energy-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  'oil-gas-fired-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C8 6 4 10 4 14a8 8 0 0016 0c0-4-4-8-8-12z"/><circle cx="12" cy="15" r="3"/></svg>`,
  'lean-gas-fired-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20V10l4-6h8l4 6v10"/><path d="M4 14h16"/><circle cx="12" cy="8" r="2"/></svg>`,
  'whrb': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M8 4v16M16 4v16M4 12h16"/><path d="M4 8h4M16 8h4M4 16h4M16 16h4"/></svg>`,
  'whru': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M8 12a4 4 0 018 0M12 8v8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>`,
  'fired-heaters-process-furnaces': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 14c0-2 2-4 4-6 2 2 4 4 4 6s-2 4-4 4-4-2-4-4z"/></svg>`,
  'fbc-afbc-cfbc': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V5h10v3"/><circle cx="8" cy="14" r="1.5"/><circle cx="12" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/></svg>`,
  'pulverised-fuel-fired-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20l4-16h8l4 16"/><path d="M8 12h8M6 16h12"/><circle cx="12" cy="8" r="1"/></svg>`,
  'bidrum-boilers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="7" rx="8" ry="3"/><ellipse cx="12" cy="17" rx="8" ry="3"/><path d="M4 7v10M20 7v10"/><path d="M8 10v4M12 10v4M16 10v4"/></svg>`,
  'hrsg': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M10 6v12M14 6v12M18 6v12"/><path d="M2 12h20"/></svg>`,
  'default': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>`
};

function getProductIcon(productId) {
  return productIcons[productId] || productIcons['default'];
}

export class ProductSelectionScreen extends BaseScreen {
  constructor() {
    super();
  }

  render() {
    const divisionId = navigationService.selectedDivisionId;
    const divisions = catalogService.getDivisions();
    const division = divisions.find(d => d.id === divisionId);
    const divisionName = division?.name || 'Division';
    const iconColor = getIconColor(division?.icon);

    const container = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header compact-header' },
      el('div', { className: 'compact-header-row' },
        el('div', { className: 'breadcrumb' },
          el('span', { className: 'breadcrumb-item clickable', onClick: () => navigationService.navigateTo(Screen.DivisionSelection) }, divisionName),
          el('span', { className: 'breadcrumb-separator' }, '\u203A'),
          el('span', { className: 'breadcrumb-item active' }, 'Select Product')
        ),
        el('h1', { className: 'screen-title' }, 'Select Product')
      )
    );

    this._grid = el('div', { className: 'product-grid screen-body' });

    container.append(header, this._grid);
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
    this._grid.innerHTML = '';

    if (products.length === 0) {
      this._grid.innerHTML = `<div class="empty-state">
        <div class="empty-state-title">No products available</div>
        <div class="empty-state-text">This division has no products configured.</div>
      </div>`;
      return;
    }

    for (const product of products) {
      const card = this._createProductCard(product);
      this._grid.appendChild(card);
    }
  }

  _createProductCard(product) {
    const blockCount = product.pfdBlocks?.length || 0;
    const hasBlocks = blockCount > 0;
    const iconSvg = getProductIcon(product.id);

    const card = el('div', {
      className: `product-card compact${hasBlocks ? '' : ' disabled'}`,
      tabindex: hasBlocks ? '0' : '-1',
      role: 'option',
      dataset: { productId: product.id },
      onClick: () => {
        if (hasBlocks) this._selectAndNavigate(product.id);
      },
      onKeydown: (e) => {
        if (hasBlocks && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          this._selectAndNavigate(product.id);
        }
      }
    },
      el('div', { className: 'product-card-icon', htmlContent: iconSvg }),
      el('div', { className: 'product-card-body' },
        el('div', { className: 'product-card-name' }, product.name),
        el('div', { className: 'product-card-meta' },
          blockCount > 0
            ? el('span', { className: 'product-card-badge' }, `${blockCount} Blocks`)
            : el('span', { className: 'product-card-badge empty' }, 'No blocks')
        )
      ),
      el('div', { className: 'product-card-arrow' }, '\u203A')
    );

    return card;
  }

  _selectAndNavigate(productId) {
    this._grid.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
    const card = this._grid.querySelector(`[data-product-id="${productId}"]`);
    if (card) card.classList.add('selected');

    navigationService.setSelectedProduct(productId);
    setTimeout(() => {
      navigationService.navigateTo(Screen.PfdBlockSelection);
    }, 150);
  }
}
