/**
 * Session state models
 */

export class BlockConfiguration {
  constructor({ blockId, blockName, isConfigured = false, sheetConfigurations = {} }) {
    this.blockId = blockId;
    this.blockName = blockName;
    this.isConfigured = isConfigured;
    this.lastSavedUtc = null;
    this.sheetConfigurations = sheetConfigurations;
  }
}

export class SheetConfiguration {
  constructor({ sheetName, selectedItemIds = [] }) {
    this.sheetName = sheetName;
    this.selectedItemIds = selectedItemIds;
  }
}
