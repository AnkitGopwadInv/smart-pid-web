/**
 * Navigation service - manages screen transitions and selection state.
 * Port of Infrastructure/NavigationService.cs
 */
import { eventBus } from './event-bus.js';

/** Screen enum matching C# Screen enum */
export const Screen = Object.freeze({
  DivisionSelection: 'DivisionSelection',
  ProductSelection: 'ProductSelection',
  PfdBlockSelection: 'PfdBlockSelection',
  MainHub: 'MainHub',
  BlockConfiguration: 'BlockConfiguration'
});

class NavigationService {
  constructor() {
    this._currentScreen = Screen.DivisionSelection;
    this.selectedDivisionId = null;
    this.selectedProductId = null;
    this.selectedPfdBlockId = null;
    this._selectedPfdBlockIds = [];
  }

  get currentScreen() {
    return this._currentScreen;
  }

  get selectedPfdBlockIds() {
    return [...this._selectedPfdBlockIds];
  }

  /**
   * Navigate to a screen
   * @param {string} screen - Screen enum value
   */
  navigateTo(screen) {
    if (this._currentScreen === screen) return;

    const previous = this._currentScreen;
    this._currentScreen = screen;
    console.log(`Navigation: ${previous} → ${screen}`);
    eventBus.emit('screen:changed', screen);
  }

  /**
   * Go back one screen with cascading state clear
   */
  goBack() {
    const previousScreen = {
      [Screen.ProductSelection]: Screen.DivisionSelection,
      [Screen.PfdBlockSelection]: Screen.ProductSelection,
      [Screen.MainHub]: Screen.PfdBlockSelection,
      [Screen.BlockConfiguration]: Screen.MainHub
    }[this._currentScreen] || Screen.DivisionSelection;

    // Clear downstream state
    if (previousScreen === Screen.DivisionSelection) {
      this.selectedDivisionId = null;
      this.selectedProductId = null;
      this.selectedPfdBlockId = null;
      this._selectedPfdBlockIds = [];
    } else if (previousScreen === Screen.ProductSelection) {
      this.selectedProductId = null;
      this.selectedPfdBlockId = null;
      this._selectedPfdBlockIds = [];
    } else if (previousScreen === Screen.PfdBlockSelection) {
      this.selectedPfdBlockId = null;
      this._selectedPfdBlockIds = [];
    }

    this.navigateTo(previousScreen);
  }

  setSelectedDivision(divisionId) {
    if (!divisionId) return;
    this.selectedDivisionId = divisionId;
    // Clear downstream
    this.selectedProductId = null;
    this.selectedPfdBlockId = null;
  }

  setSelectedProduct(productId) {
    if (!productId) return;
    this.selectedProductId = productId;
    this.selectedPfdBlockId = null;
  }

  setSelectedPfdBlock(pfdBlockId) {
    if (!pfdBlockId) return;
    this.selectedPfdBlockId = pfdBlockId;
  }

  setSelectedPfdBlocks(pfdBlockIds) {
    this._selectedPfdBlockIds = pfdBlockIds ? [...pfdBlockIds] : [];
    this.selectedPfdBlockId = null;
  }

  /**
   * Full reset back to start
   */
  reset() {
    this.selectedDivisionId = null;
    this.selectedProductId = null;
    this.selectedPfdBlockId = null;
    this._selectedPfdBlockIds = [];
    this.navigateTo(Screen.DivisionSelection);
  }
}

export const navigationService = new NavigationService();
