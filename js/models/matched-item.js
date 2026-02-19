/**
 * Matched item - result of Excel <-> Textract matching
 */
export class MatchedItem {
  constructor({ itemId, itemName, isMandatory, matchText, boundingBox, confidence }) {
    this.itemId = itemId;
    this.itemName = itemName;
    this.isMandatory = isMandatory;
    this.matchText = matchText;
    this.boundingBox = boundingBox;
    this.confidence = confidence;
  }
}
