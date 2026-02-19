/**
 * Mandatory rule engine - ISA-5.1 regex patterns for P&ID tags.
 * Port of Services/Selection/MandatoryRuleEngine.cs
 */

const DEFAULT_PATTERNS = [
  // Primary equipment - always required
  /^P-\d+[A-Z]?/i,    // Pumps: P-101, P-101A
  /^V-\d+[A-Z]?/i,    // Valves: V-101, V-205B
  /^TK-\d+/i,          // Tanks: TK-100
  /^T-\d+/i,           // Tanks (alternate): T-201
  /^R-\d+/i,           // Reactors: R-101
  /^E-\d+/i,           // Exchangers: E-101
  /^C-\d+/i,           // Compressors: C-101

  // Safety critical - always required
  /^PSV-\d+/i,         // Pressure Safety Valves
  /^PRV-\d+/i,         // Pressure Relief Valves
  /^RD-\d+/i,          // Rupture Discs
  /^SDV-\d+/i,         // Shutdown Valves
  /^SIS-/i,            // Safety Instrumented Systems
  /^ESD-/i,            // Emergency Shutdown

  // Alternative naming conventions
  /^PUMP-?\d+/i,
  /^TANK-?\d+/i,
  /^VALVE-?\d+/i
];

class MandatoryRuleEngine {
  constructor() {
    this._patterns = [...DEFAULT_PATTERNS];
  }

  get patterns() {
    return this._patterns;
  }

  /**
   * Check if an item text matches a mandatory pattern
   * @param {string} text
   * @returns {boolean}
   */
  isMandatory(text) {
    if (!text || !text.trim()) return false;
    const trimmed = text.trim();
    return this._patterns.some(pattern => pattern.test(trimmed));
  }
}

export const mandatoryRuleEngine = new MandatoryRuleEngine();
