/**
 * Matching service - correlates Excel items with Textract detected text.
 * Port of Services/Matching/MatchingService.cs
 */

class MatchingService {
  /**
   * Match Excel items with Textract results
   * @param {Array<{itemId: string, itemName: string, matchText: string, isMandatory: boolean}>} excelItems
   * @param {{items: Array<{text: string, boundingBox: Object, confidence: number}>}} textractResult
   * @returns {{matchedItems: Array, unmatchedExcelItems: Array}}
   */
  matchItems(excelItems, textractResult) {
    if (!excelItems || excelItems.length === 0) {
      return { matchedItems: [], unmatchedExcelItems: [] };
    }

    if (!textractResult || !textractResult.items || textractResult.items.length === 0) {
      return { matchedItems: [], unmatchedExcelItems: [...excelItems] };
    }

    // Build lookup: text -> first DetectedTextItem
    const textractLookup = new Map();
    for (const item of textractResult.items) {
      if (item.text && !textractLookup.has(item.text)) {
        textractLookup.set(item.text, item);
      }
    }

    const matchedItems = [];
    const unmatchedExcelItems = [];

    for (const excelItem of excelItems) {
      if (!excelItem.matchText) {
        unmatchedExcelItems.push(excelItem);
        continue;
      }

      const textractItem = textractLookup.get(excelItem.matchText);
      if (textractItem) {
        matchedItems.push({
          itemId: excelItem.itemId,
          itemName: excelItem.itemName,
          isMandatory: excelItem.isMandatory,
          matchText: excelItem.matchText,
          boundingBox: textractItem.boundingBox,
          confidence: textractItem.confidence
        });
      } else {
        unmatchedExcelItems.push(excelItem);
      }
    }

    return { matchedItems, unmatchedExcelItems };
  }
}

export const matchingService = new MatchingService();
