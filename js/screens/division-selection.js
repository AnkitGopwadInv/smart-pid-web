/**
 * Screen 1: Division Selection
 * Auto-redirects on selection — no Next button needed.
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';
import { getIconSvg, getIconColor } from '../models/catalog.js';

export class DivisionSelectionScreen extends BaseScreen {
  constructor() {
    super();
  }

  render() {
    const container = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header' },
      el('h1', { className: 'screen-title' }, 'Select Division'),
      el('p', { className: 'screen-subtitle' }, 'Choose your business division to get started')
    );

    this._grid = el('div', { className: 'division-grid screen-body' });

    container.append(header, this._grid);
    return container;
  }

  onMount() {
    this._loadDivisions();
  }

  async _loadDivisions() {
    if (!catalogService.isLoaded) {
      const result = await catalogService.loadCatalog();
      if (!result.isSuccess) {
        this._grid.innerHTML = `<div class="error-panel">
          <span class="error-panel-icon">&#9888;</span>
          <span class="error-panel-text">Failed to load catalog: ${result.error}</span>
        </div>`;
        return;
      }
    }

    const divisions = catalogService.getDivisions();
    this._grid.innerHTML = '';

    for (const division of divisions) {
      const card = this._createCard(division);
      this._grid.appendChild(card);
    }
  }

  _createCard(division) {
    const productCount = catalogService.getProductCount(division.id);
    const iconColor = getIconColor(division.icon);

    const card = el('div', {
      className: 'division-card',
      tabindex: '0',
      role: 'option',
      dataset: { divisionId: division.id },
      onClick: () => this._selectAndNavigate(division.id),
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._selectAndNavigate(division.id);
        }
      }
    },
      el('div', { className: 'division-card-icon', htmlContent: getIconSvg(division.icon, iconColor) }),
      el('div', { className: 'division-card-name' }, division.name),
      el('div', { className: 'division-card-description' }, division.description),
      el('div', { className: 'division-card-footer' },
        el('span', { className: 'count' }, String(productCount)),
        ` products available`
      )
    );

    return card;
  }

  _selectAndNavigate(divisionId) {
    // Highlight card briefly then navigate
    this._grid.querySelectorAll('.division-card').forEach(c => c.classList.remove('selected'));
    const card = this._grid.querySelector(`[data-division-id="${divisionId}"]`);
    if (card) card.classList.add('selected');

    navigationService.setSelectedDivision(divisionId);
    // Auto-redirect after brief visual feedback
    setTimeout(() => {
      navigationService.navigateTo(Screen.ProductSelection);
    }, 150);
  }
}
