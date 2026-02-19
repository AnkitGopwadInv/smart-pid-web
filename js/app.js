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
    this._statusEl = null;
    this._progressFill = null;
  }

  async init() {
    // Get DOM elements
    this._contentEl = document.getElementById('content');
    this._statusEl = document.getElementById('status-text');
    this._progressFill = document.getElementById('progress-fill');

    // Render sidebar
    const sidebarEl = document.getElementById('sidebar');
    this._sidebar.render(sidebarEl);

    // Load catalog data
    this._setStatus('Loading catalog...');
    const result = await catalogService.loadCatalog();
    if (!result.isSuccess) {
      this._setStatus(`Error: ${result.error}`);
    }

    // Load mock data
    await mockDataService.loadMockData();

    // Listen for screen changes
    eventBus.on('screen:changed', (screen) => this._onScreenChanged(screen));

    // Mount initial screen
    this._onScreenChanged(Screen.DivisionSelection);
    this._setStatus('Ready');
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

    // Update status
    const screenNames = {
      [Screen.DivisionSelection]: 'Step 1: Division Selection',
      [Screen.ProductSelection]: 'Step 2: Product Selection',
      [Screen.PfdBlockSelection]: 'Step 3: PFD Block Selection',
      [Screen.MainHub]: 'Step 4: Main Hub - Configure Blocks',
      [Screen.BlockConfiguration]: 'Step 5: Block Configuration'
    };
    this._setStatus(screenNames[screen] || screen);

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
  }

  _setStatus(text) {
    if (this._statusEl) {
      this._statusEl.textContent = text;
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('App initialization failed:', err);
  });
});
