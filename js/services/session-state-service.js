/**
 * Session state service - tracks block configurations across the workflow.
 * Port of Services/Session/SessionStateService.cs
 */
import { eventBus } from './event-bus.js';
import { navigationService } from './navigation-service.js';

class SessionStateService {
  constructor() {
    /** @type {Map<string, Object>} */
    this._blockConfigurations = new Map();
    this._restoreFromStorage();
  }

  get configuredBlockCount() {
    let count = 0;
    for (const config of this._blockConfigurations.values()) {
      if (config.isConfigured) count++;
    }
    return count;
  }

  get totalBlockCount() {
    return navigationService.selectedPfdBlockIds.length;
  }

  get allBlocksConfigured() {
    return this.totalBlockCount > 0 && this.configuredBlockCount === this.totalBlockCount;
  }

  /**
   * Save configuration for a block
   * @param {string} blockId
   * @param {string} blockName
   * @param {Array<{sheetName: string, selectedItemIds: string[]}>} sheetConfigurations
   */
  saveBlockConfiguration(blockId, blockName, sheetConfigurations) {
    const config = {
      blockId,
      blockName,
      isConfigured: true,
      lastSavedUtc: new Date().toISOString(),
      sheetConfigurations: {}
    };

    for (const sc of sheetConfigurations) {
      config.sheetConfigurations[sc.sheetName] = sc;
    }

    this._blockConfigurations.set(blockId, config);
    this._persistToStorage();
    eventBus.emit('configuration:changed', blockId);
  }

  /**
   * Get block configuration
   * @param {string} blockId
   * @returns {Object|null}
   */
  getBlockConfiguration(blockId) {
    return this._blockConfigurations.get(blockId) || null;
  }

  /**
   * Check if a block is configured
   * @param {string} blockId
   * @returns {boolean}
   */
  isBlockConfigured(blockId) {
    const config = this._blockConfigurations.get(blockId);
    return config?.isConfigured === true;
  }

  /**
   * Get the next pending (unconfigured) block ID
   * @returns {string|null}
   */
  getNextPendingBlockId() {
    const selectedBlocks = navigationService.selectedPfdBlockIds;
    for (const blockId of selectedBlocks) {
      if (!this.isBlockConfigured(blockId)) {
        return blockId;
      }
    }
    return null;
  }

  /**
   * Clear all session state
   */
  clearAll() {
    this._blockConfigurations.clear();
    this._persistToStorage();
    eventBus.emit('configuration:cleared');
  }

  _persistToStorage() {
    try {
      const data = Object.fromEntries(this._blockConfigurations);
      localStorage.setItem('smartpid_session', JSON.stringify(data));
    } catch { /* ignore */ }
  }

  _restoreFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('smartpid_session') || '{}');
      for (const [key, value] of Object.entries(data)) {
        this._blockConfigurations.set(key, value);
      }
    } catch { /* ignore */ }
  }
}

export const sessionStateService = new SessionStateService();
