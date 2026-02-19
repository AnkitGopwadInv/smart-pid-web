/**
 * Screen 1: Division Selection
 * Port of Views/DivisionSelectionView.xaml + ViewModels/DivisionSelectionViewModel.cs
 */
import { BaseScreen } from './base-screen.js';
import { el } from '../utils/dom.js';
import { catalogService } from '../services/catalog-service.js';
import { navigationService, Screen } from '../services/navigation-service.js';
import { getIconSvg, getIconColor } from '../models/catalog.js';

export class DivisionSelectionScreen extends BaseScreen {
  constructor() {
    super();
    this._selectedDivisionId = null;
    this._nextBtn = null;
  }

  render() {
    const container = el('div', { className: 'screen' });

    // Header
    const header = el('div', { className: 'screen-header' },
      el('h1', { className: 'screen-title' }, 'Select Division'),
      el('p', { className: 'screen-subtitle' }, 'Choose your business division to get started')
    );

    // Card grid
    this._grid = el('div', { className: 'division-grid screen-body' });

    // Footer
    this._nextBtn = el('button', {
      className: 'btn btn-primary',
      disabled: 'disabled',
      onClick: () => this._onNext(),
      style: { minWidth: '120px' }
    }, 'Next \u2192');

    const footer = el('div', { className: 'screen-footer' },
      el('div'),
      this._nextBtn
    );

    container.append(header, this._grid, footer);
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
      onClick: () => this._selectDivision(division.id),
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._selectDivision(division.id);
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

  _selectDivision(divisionId) {
    // Deselect all
    this._grid.querySelectorAll('.division-card').forEach(c => c.classList.remove('selected'));

    // Select new
    const card = this._grid.querySelector(`[data-division-id="${divisionId}"]`);
    if (card) card.classList.add('selected');

    this._selectedDivisionId = divisionId;
    this._nextBtn.disabled = false;
  }

  _onNext() {
    if (!this._selectedDivisionId) return;
    navigationService.setSelectedDivision(this._selectedDivisionId);
    navigationService.navigateTo(Screen.ProductSelection);
  }
}
