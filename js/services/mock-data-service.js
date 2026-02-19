/**
 * Mock data service - generates mock Textract + Excel data
 * Replaces AWS Textract and Excel services for the web demo
 */

class MockDataService {
  constructor() {
    this._textractData = null;
    this._excelData = null;
  }

  /**
   * Load mock data files
   */
  async loadMockData() {
    try {
      const [textractRes, excelRes] = await Promise.all([
        fetch('./data/mock/textract-results.json'),
        fetch('./data/mock/excel-items.json')
      ]);
      if (textractRes.ok) this._textractData = await textractRes.json();
      if (excelRes.ok) this._excelData = await excelRes.json();
    } catch (err) {
      console.warn('Mock data not found, using generated data:', err.message);
    }
  }

  /**
   * Get mock Textract results for a PFD diagram
   * @returns {{items: Array<{text: string, boundingBox: {x, y, width, height}, confidence: number}>}}
   */
  getPfdTextractResults() {
    if (this._textractData?.pfd) return this._textractData.pfd;

    // Generate mock data with realistic block names at sensible positions
    return {
      items: [
        { text: 'STEAM DRUM', boundingBox: { x: 0.35, y: 0.15, width: 0.12, height: 0.03 }, confidence: 98.5 },
        { text: 'DEAERATOR', boundingBox: { x: 0.10, y: 0.40, width: 0.10, height: 0.03 }, confidence: 97.2 },
        { text: 'ECONOMIZER', boundingBox: { x: 0.55, y: 0.35, width: 0.11, height: 0.03 }, confidence: 96.8 },
        { text: 'CHEMICAL DOSING', boundingBox: { x: 0.75, y: 0.25, width: 0.14, height: 0.03 }, confidence: 95.1 },
        { text: 'BFW PUMPS', boundingBox: { x: 0.20, y: 0.65, width: 0.10, height: 0.03 }, confidence: 94.3 },
        { text: 'BOILER FEED WATER PUMP', boundingBox: { x: 0.45, y: 0.70, width: 0.20, height: 0.03 }, confidence: 93.7 },
        { text: 'BLOWDOWN TANK', boundingBox: { x: 0.70, y: 0.55, width: 0.13, height: 0.03 }, confidence: 97.9 }
      ]
    };
  }

  /**
   * Get mock Excel items for a block + sheet
   * @param {string} blockId
   * @param {string} sheetName
   * @returns {Array<{itemId, itemName, matchText, isMandatory}>}
   */
  getExcelItems(blockId, sheetName) {
    if (this._excelData?.[blockId]?.[sheetName]) {
      return this._excelData[blockId][sheetName];
    }

    // Generate realistic items per block
    const blockItems = this._generateItemsForBlock(blockId);
    return blockItems;
  }

  /**
   * Get sheet names for a block
   * @param {string} blockId
   * @returns {string[]}
   */
  getSheetNames(blockId) {
    if (this._excelData?.[blockId]) {
      return Object.keys(this._excelData[blockId]);
    }
    // Default: every block has at least one sheet
    return ['Sheet1'];
  }

  /**
   * Get mock Textract results for a block sheet
   * @param {string} blockId
   * @param {string} sheetName
   * @returns {{items: Array}}
   */
  getSheetTextractResults(blockId, sheetName) {
    if (this._textractData?.[blockId]?.[sheetName]) {
      return this._textractData[blockId][sheetName];
    }

    // Generate mock textract data matching the Excel items
    const excelItems = this.getExcelItems(blockId, sheetName);
    const items = excelItems.map((item, i) => ({
      text: item.matchText,
      boundingBox: {
        x: 0.05 + (i % 3) * 0.30,
        y: 0.08 + Math.floor(i / 3) * 0.15,
        width: 0.15,
        height: 0.025
      },
      confidence: 90 + Math.random() * 10
    }));

    return { items };
  }

  _generateItemsForBlock(blockId) {
    const itemSets = {
      steam_drum: [
        { itemId: 'SD-001', itemName: 'Steam Drum Assembly', matchText: 'V-101', isMandatory: true },
        { itemId: 'SD-002', itemName: 'Level Indicator LI-101', matchText: 'LI-101', isMandatory: false },
        { itemId: 'SD-003', itemName: 'Pressure Safety Valve', matchText: 'PSV-101', isMandatory: true },
        { itemId: 'SD-004', itemName: 'Level Control Valve', matchText: 'LCV-101', isMandatory: false },
        { itemId: 'SD-005', itemName: 'Steam Outlet Valve', matchText: 'V-102', isMandatory: true },
        { itemId: 'SD-006', itemName: 'Drain Valve', matchText: 'V-103', isMandatory: true },
        { itemId: 'SD-007', itemName: 'Temperature Indicator', matchText: 'TI-101', isMandatory: false }
      ],
      deaerator: [
        { itemId: 'DA-001', itemName: 'Deaerator Tank', matchText: 'TK-201', isMandatory: true },
        { itemId: 'DA-002', itemName: 'Spray Valve', matchText: 'V-201', isMandatory: true },
        { itemId: 'DA-003', itemName: 'Vent Valve', matchText: 'V-202', isMandatory: true },
        { itemId: 'DA-004', itemName: 'Level Transmitter', matchText: 'LT-201', isMandatory: false },
        { itemId: 'DA-005', itemName: 'Pressure Indicator', matchText: 'PI-201', isMandatory: false }
      ],
      economizer: [
        { itemId: 'EC-001', itemName: 'Economizer Coil', matchText: 'E-301', isMandatory: true },
        { itemId: 'EC-002', itemName: 'Inlet Isolation Valve', matchText: 'V-301', isMandatory: true },
        { itemId: 'EC-003', itemName: 'Outlet Isolation Valve', matchText: 'V-302', isMandatory: true },
        { itemId: 'EC-004', itemName: 'Temperature Transmitter', matchText: 'TT-301', isMandatory: false },
        { itemId: 'EC-005', itemName: 'Bypass Valve', matchText: 'V-303', isMandatory: false },
        { itemId: 'EC-006', itemName: 'Drain Valve', matchText: 'V-304', isMandatory: true }
      ],
      chemical_dosing: [
        { itemId: 'CD-001', itemName: 'Chemical Tank', matchText: 'TK-401', isMandatory: true },
        { itemId: 'CD-002', itemName: 'Dosing Pump A', matchText: 'P-401A', isMandatory: true },
        { itemId: 'CD-003', itemName: 'Dosing Pump B', matchText: 'P-401B', isMandatory: true },
        { itemId: 'CD-004', itemName: 'Level Indicator', matchText: 'LI-401', isMandatory: false },
        { itemId: 'CD-005', itemName: 'Agitator', matchText: 'AG-401', isMandatory: false }
      ],
      bfw_pumps: [
        { itemId: 'BP-001', itemName: 'BFW Pump A', matchText: 'P-501A', isMandatory: true },
        { itemId: 'BP-002', itemName: 'BFW Pump B', matchText: 'P-501B', isMandatory: true },
        { itemId: 'BP-003', itemName: 'Suction Strainer', matchText: 'STR-501', isMandatory: false },
        { itemId: 'BP-004', itemName: 'Check Valve', matchText: 'V-501', isMandatory: true },
        { itemId: 'BP-005', itemName: 'Pressure Gauge', matchText: 'PI-501', isMandatory: false }
      ],
      boiler_feed_water_pump: [
        { itemId: 'BF-001', itemName: 'Feed Water Pump', matchText: 'P-601', isMandatory: true },
        { itemId: 'BF-002', itemName: 'Recirculation Valve', matchText: 'V-601', isMandatory: true },
        { itemId: 'BF-003', itemName: 'Flow Transmitter', matchText: 'FT-601', isMandatory: false }
      ],
      blowdown_tank: [
        { itemId: 'BD-001', itemName: 'Blowdown Tank', matchText: 'TK-701', isMandatory: true },
        { itemId: 'BD-002', itemName: 'Blowdown Valve', matchText: 'V-701', isMandatory: true },
        { itemId: 'BD-003', itemName: 'Flash Tank', matchText: 'TK-702', isMandatory: true },
        { itemId: 'BD-004', itemName: 'Drain Valve', matchText: 'V-702', isMandatory: true },
        { itemId: 'BD-005', itemName: 'Temperature Indicator', matchText: 'TI-701', isMandatory: false },
        { itemId: 'BD-006', itemName: 'Level Switch', matchText: 'LS-701', isMandatory: false }
      ]
    };

    return itemSets[blockId] || [
      { itemId: 'GEN-001', itemName: 'Main Equipment', matchText: 'EQ-001', isMandatory: true },
      { itemId: 'GEN-002', itemName: 'Isolation Valve', matchText: 'V-001', isMandatory: true },
      { itemId: 'GEN-003', itemName: 'Instrument', matchText: 'INST-001', isMandatory: false }
    ];
  }
}

export const mockDataService = new MockDataService();
