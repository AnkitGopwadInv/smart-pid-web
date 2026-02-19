/**
 * Abstract base screen class
 */
export class BaseScreen {
  constructor() {
    this._mounted = false;
    this._container = null;
  }

  /**
   * Render screen HTML - must be overridden
   * @returns {HTMLElement}
   */
  render() {
    throw new Error('render() must be implemented');
  }

  /**
   * Mount screen into the content area
   * @param {HTMLElement} container
   */
  mount(container) {
    this._container = container;
    container.innerHTML = '';
    const el = this.render();
    container.appendChild(el);
    this._mounted = true;
    this.onMount();
  }

  /**
   * Called after mount - override for initialization logic
   */
  onMount() {}

  /**
   * Unmount screen
   */
  unmount() {
    this._mounted = false;
    this.onUnmount();
    if (this._container) {
      this._container.innerHTML = '';
    }
  }

  /**
   * Called before unmount - override for cleanup
   */
  onUnmount() {}

  get isMounted() { return this._mounted; }
}
