/**
 * Catalog service - loads and queries catalog.json
 * Port of Services/Catalog/CatalogService.cs
 */

class CatalogService {
  constructor() {
    this._catalog = null;
    this._loaded = false;
  }

  /**
   * Load catalog from JSON file
   * @returns {Promise<{isSuccess: boolean, error?: string}>}
   */
  async loadCatalog() {
    try {
      const response = await fetch('./data/catalog.json');
      if (!response.ok) {
        return { isSuccess: false, error: `HTTP ${response.status}` };
      }
      this._catalog = await response.json();
      this._loaded = true;
      return { isSuccess: true };
    } catch (err) {
      return { isSuccess: false, error: err.message };
    }
  }

  get isLoaded() { return this._loaded; }

  /**
   * Get all divisions
   * @returns {Array<{id: string, name: string, description: string, icon: string, products: Array}>}
   */
  getDivisions() {
    return this._catalog?.divisions || [];
  }

  /**
   * Get product count for a division
   * @param {string} divisionId
   * @returns {number}
   */
  getProductCount(divisionId) {
    const division = this.getDivisions().find(d => d.id === divisionId);
    return division?.products?.length || 0;
  }

  /**
   * Get products for a division
   * @param {string} divisionId
   * @returns {Array}
   */
  getProducts(divisionId) {
    const division = this.getDivisions().find(d => d.id === divisionId);
    return division?.products || [];
  }

  /**
   * Get PFD blocks for a product
   * @param {string} divisionId
   * @param {string} productId
   * @returns {Array}
   */
  getPfdBlocks(divisionId, productId) {
    const products = this.getProducts(divisionId);
    const product = products.find(p => p.id === productId);
    return product?.pfdBlocks || [];
  }
}

export const catalogService = new CatalogService();
