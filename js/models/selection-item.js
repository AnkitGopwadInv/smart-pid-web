/**
 * Selection item model with bounding box
 */
export class SelectionItem {
  constructor({ id, text, isMandatory = false, isSelected = false, confidence = 0, boundingBox = null }) {
    this.id = id;
    this.text = text;
    this.isMandatory = isMandatory;
    this.isSelected = isMandatory ? true : isSelected;
    this.confidence = confidence;
    this.boundingBox = boundingBox || { x: 0, y: 0, width: 0, height: 0 };
  }
}

export class BoundingBox {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}
