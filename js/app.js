/**
 * Smart P&ID Web App - Entry point
 * Initializes services, mounts shell, handles screen transitions
 */
import { eventBus } from './services/event-bus.js';
import { navigationService, Screen } from './services/navigation-service.js';
import { catalogService } from './services/catalog-service.js';
import { mockDataService } from './services/mock-data-service.js';
import { Sidebar } from './components/sidebar.js';
import { DivisionSelectionScreen } from './screens/division-selection.js';
import { ProductSelectionScreen } from './screens/product-selection.js';
import { PfdBlockSelectionScreen } from './screens/pfd-block-selection.js';
import { MainHubScreen } from './screens/main-hub.js';
import { BlockConfigurationScreen } from './screens/block-configuration.js';

class App {
  constructor() {
    this._sidebar = new Sidebar();
    this._currentScreen = null;
    this._contentEl = null;
    this._progressFill = null;
    this._headerEl = null;
    this._headerCompact = false;
    this._scrollAccum = 0;
    this._shrinkCooldown = false;
  }

  async init() {
    // Get DOM elements
    this._contentEl = document.getElementById('content');
    this._progressFill = document.getElementById('progress-fill');
    this._headerEl = document.getElementById('app-header');

    // Render sidebar
    const sidebarEl = document.getElementById('sidebar');
    this._sidebar.render(sidebarEl);

    // Header shrink on scroll (with debounce to prevent flicker)
    this._setupHeaderShrink();

    // Load catalog data
    const result = await catalogService.loadCatalog();
    if (!result.isSuccess) {
      console.error('Failed to load catalog:', result.error);
    }

    // Load mock data
    await mockDataService.loadMockData();

    // Listen for screen changes
    eventBus.on('screen:changed', (screen) => this._onScreenChanged(screen));

    // Mount initial screen
    this._onScreenChanged(Screen.DivisionSelection);
  }

  _onScreenChanged(screen) {
    // Unmount current screen
    if (this._currentScreen) {
      this._currentScreen.unmount();
    }

    // Create new screen
    const screenMap = {
      [Screen.DivisionSelection]: () => new DivisionSelectionScreen(),
      [Screen.ProductSelection]: () => new ProductSelectionScreen(),
      [Screen.PfdBlockSelection]: () => new PfdBlockSelectionScreen(),
      [Screen.MainHub]: () => new MainHubScreen(),
      [Screen.BlockConfiguration]: () => new BlockConfigurationScreen()
    };

    const createScreen = screenMap[screen];
    if (!createScreen) {
      console.error(`Unknown screen: ${screen}`);
      return;
    }

    this._currentScreen = createScreen();
    this._currentScreen.mount(this._contentEl);

    // Update progress bar
    const screenOrder = [
      Screen.DivisionSelection,
      Screen.ProductSelection,
      Screen.PfdBlockSelection,
      Screen.MainHub,
      Screen.BlockConfiguration
    ];
    const idx = screenOrder.indexOf(screen);
    const progressPercent = ((idx + 1) / screenOrder.length) * 100;
    if (this._progressFill) {
      this._progressFill.style.width = `${progressPercent}%`;
    }

    // Header: full on step 1, compact on all other steps
    const isStep1 = screen === Screen.DivisionSelection;
    this._setHeaderCompact(!isStep1);
    this._scrollAccum = 0;
  }

  /**
   * Header shrink/expand with scroll accumulation + cooldown to prevent flicker.
   * - Requires 60px of sustained scroll-down before shrinking
   * - Requires 40px of sustained scroll-up before expanding
   * - 300ms cooldown after each state change
   * - Hover on header expands immediately
   */
  _setupHeaderShrink() {
    const header = this._headerEl;
    if (!header) return;

    // Hover expands, mouseleave restores compact (except on step 1)
    header.addEventListener('mouseenter', () => {
      this._setHeaderCompact(false);
      this._scrollAccum = 0;
    });
    header.addEventListener('mouseleave', () => {
      // Re-compact if not on step 1
      const isStep1 = navigationService.currentScreen === Screen.DivisionSelection;
      if (!isStep1) {
        this._setHeaderCompact(true);
      }
    });

    // Capture scroll on any descendant of content
    this._contentEl.addEventListener('scroll', (e) => {
      const t = e.target;
      const scrollTop = t.scrollTop || 0;
      const last = t._lastScrollY || 0;
      const delta = scrollTop - last;
      t._lastScrollY = scrollTop;

      if (this._shrinkCooldown) return;

      // Accumulate in the current direction; reset if direction changes
      if ((delta > 0 && this._scrollAccum < 0) || (delta < 0 && this._scrollAccum > 0)) {
        this._scrollAccum = 0;
      }
      this._scrollAccum += delta;

      // Shrink after 60px sustained down-scroll (and past 50px from top)
      if (!this._headerCompact && this._scrollAccum > 60 && scrollTop > 50) {
        this._setHeaderCompact(true);
        this._startCooldown();
      }
      // Expand after 40px sustained up-scroll
      else if (this._headerCompact && this._scrollAccum < -40) {
        this._setHeaderCompact(false);
        this._startCooldown();
      }
    }, true);
  }

  _setHeaderCompact(compact) {
    if (!this._headerEl || this._headerCompact === compact) return;
    this._headerCompact = compact;
    this._headerEl.classList.toggle('header-compact', compact);
  }

  _startCooldown() {
    this._shrinkCooldown = true;
    this._scrollAccum = 0;
    setTimeout(() => { this._shrinkCooldown = false; }, 300);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('App initialization failed:', err);
  });
});
