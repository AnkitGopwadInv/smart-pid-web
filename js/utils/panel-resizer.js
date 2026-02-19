/**
 * Panel Resizer - VS Code-style drag-to-resize for panels.
 * Supports auto-collapse when dragged below a threshold.
 */

/**
 * Make a panel resizable by dragging an edge handle.
 * @param {object} opts
 * @param {HTMLElement} opts.panel - The panel element to resize
 * @param {string} opts.edge - 'right' or 'left' — which edge the handle sits on
 * @param {number} opts.minWidth - Minimum width before collapsing (px)
 * @param {number} opts.maxWidth - Maximum allowed width (px)
 * @param {number} opts.collapseThreshold - Width below which panel collapses (px)
 * @param {string} opts.collapsedClass - CSS class added when collapsed
 * @param {number} [opts.defaultWidth] - Initial width (px)
 * @param {function} [opts.onResize] - Callback on resize(width, collapsed)
 * @returns {{ handle: HTMLElement, destroy: function, toggle: function }}
 */
export function createPanelResizer(opts) {
  const {
    panel,
    edge = 'right',
    minWidth = 50,
    maxWidth = 500,
    collapseThreshold = 70,
    collapsedClass = 'collapsed',
    defaultWidth,
    onResize
  } = opts;

  let isCollapsed = false;
  let lastExpandedWidth = defaultWidth || panel.offsetWidth || 260;

  // Create drag handle
  const handle = document.createElement('div');
  handle.className = `resize-handle resize-handle-${edge}`;
  handle.title = 'Drag to resize';

  if (edge === 'right') {
    panel.style.position = 'relative';
    panel.appendChild(handle);
  } else {
    panel.style.position = 'relative';
    panel.appendChild(handle);
  }

  let startX = 0;
  let startWidth = 0;
  let isDragging = false;

  function onMouseDown(e) {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    handle.classList.add('active');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    let delta;
    if (edge === 'right') {
      delta = e.clientX - startX;
    } else {
      delta = startX - e.clientX;
    }

    let newWidth = startWidth + delta;

    // Auto-collapse
    if (newWidth < collapseThreshold) {
      if (!isCollapsed) {
        collapse();
      }
      return;
    }

    // Expand if was collapsed
    if (isCollapsed) {
      expand(newWidth);
    }

    // Clamp
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    panel.style.width = `${newWidth}px`;
    panel.style.minWidth = `${newWidth}px`;
    lastExpandedWidth = newWidth;

    if (onResize) onResize(newWidth, false);
  }

  function onMouseUp() {
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    handle.classList.remove('active');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function collapse() {
    isCollapsed = true;
    panel.classList.add(collapsedClass);
    panel.style.width = '';
    panel.style.minWidth = '';
    if (onResize) onResize(0, true);
  }

  function expand(width) {
    isCollapsed = false;
    panel.classList.remove(collapsedClass);
    const w = width || lastExpandedWidth;
    panel.style.width = `${w}px`;
    panel.style.minWidth = `${w}px`;
    if (onResize) onResize(w, false);
  }

  function toggle() {
    if (isCollapsed) {
      expand();
    } else {
      collapse();
    }
  }

  handle.addEventListener('mousedown', onMouseDown);

  // Double-click to toggle collapse
  handle.addEventListener('dblclick', (e) => {
    e.preventDefault();
    toggle();
  });

  return {
    handle,
    toggle,
    destroy() {
      handle.removeEventListener('mousedown', onMouseDown);
      handle.remove();
    }
  };
}
