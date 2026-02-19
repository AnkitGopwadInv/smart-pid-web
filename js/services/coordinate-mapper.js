/**
 * Coordinate mapper - converts normalized bounding boxes to pixel coordinates.
 * Port of Services/Aws/CoordinateMapper.cs
 */

const CHECKBOX_HORIZONTAL_OFFSET = 6.0;

class CoordinateMapper {
  /**
   * Map a bounding box to viewer pixel coordinates
   * @param {{x: number, y: number, width: number, height: number}} boundingBox - Normalized 0-1 coords
   * @param {number} documentPixelWidth
   * @param {number} documentPixelHeight
   * @param {number} zoomLevel
   * @returns {{x: number, y: number, width: number, height: number, checkboxX: number, checkboxY: number}}
   */
  mapToViewerCoordinates(boundingBox, documentPixelWidth, documentPixelHeight, zoomLevel) {
    if (!boundingBox || documentPixelWidth <= 0 || documentPixelHeight <= 0 || zoomLevel <= 0) {
      return { x: 0, y: 0, width: 0, height: 0, checkboxX: 0, checkboxY: 0 };
    }

    // 1. Convert normalized (0.0-1.0) to document pixel coordinates
    const docX = boundingBox.x * documentPixelWidth;
    const docY = boundingBox.y * documentPixelHeight;
    const docWidth = boundingBox.width * documentPixelWidth;
    const docHeight = boundingBox.height * documentPixelHeight;

    // 2. Apply zoom scaling
    const viewerX = docX * zoomLevel;
    const viewerY = docY * zoomLevel;
    const viewerWidth = docWidth * zoomLevel;
    const viewerHeight = docHeight * zoomLevel;

    // 3. Calculate checkbox position (right of text, vertically centered)
    const checkboxX = viewerX + viewerWidth + (CHECKBOX_HORIZONTAL_OFFSET * zoomLevel);
    const checkboxY = viewerY + (viewerHeight / 2);

    return { x: viewerX, y: viewerY, width: viewerWidth, height: viewerHeight, checkboxX, checkboxY };
  }

  /**
   * Map all items to viewer coordinates
   * @param {Array} items
   * @param {number} documentPixelWidth
   * @param {number} documentPixelHeight
   * @param {number} zoomLevel
   * @returns {Array<{item: Object, coords: Object}>}
   */
  mapAllItems(items, documentPixelWidth, documentPixelHeight, zoomLevel) {
    if (!items || items.length === 0) return [];
    return items.map(item => ({
      item,
      coords: this.mapToViewerCoordinates(
        item.boundingBox, documentPixelWidth, documentPixelHeight, zoomLevel
      )
    }));
  }
}

export const coordinateMapper = new CoordinateMapper();
