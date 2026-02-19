/**
 * Catalog data models - Division, Product, PfdBlock
 */

/**
 * Map icon name to SVG HTML
 * @param {string} icon
 * @param {string} [color]
 * @returns {string}
 */
export function getIconSvg(icon, color) {
  const colors = {
    factory: color || '#0078D4',
    leaf: color || '#6CCB5F',
    water: color || '#4FC3F7'
  };
  const c = colors[icon] || colors.factory;

  const svgs = {
    factory: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 42V18l12 8V18l12 8V10h12v32H6z" fill="${c}" opacity="0.15"/>
      <path d="M6 42V18l12 8V18l12 8V10h12v32H6z" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
      <rect x="34" y="16" width="4" height="4" rx="0.5" fill="${c}"/>
      <rect x="34" y="24" width="4" height="4" rx="0.5" fill="${c}"/>
      <rect x="34" y="32" width="4" height="4" rx="0.5" fill="${c}"/>
    </svg>`,
    leaf: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 44C24 44 8 34 8 20C8 10 16 4 24 4C32 4 40 10 40 20C40 34 24 44 24 44Z" fill="${c}" opacity="0.15"/>
      <path d="M24 44C24 44 8 34 8 20C8 10 16 4 24 4C32 4 40 10 40 20C40 34 24 44 24 44Z" stroke="${c}" stroke-width="2.5" fill="none"/>
      <path d="M24 20V36M18 26L24 20L30 26" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    water: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L36 24C36 30.627 30.627 36 24 36C17.373 36 12 30.627 12 24L24 4Z" fill="${c}" opacity="0.15"/>
      <path d="M24 4L36 24C36 30.627 30.627 36 24 36C17.373 36 12 30.627 12 24L24 4Z" stroke="${c}" stroke-width="2.5" fill="none"/>
      <path d="M8 40C12 38 16 42 20 40C24 38 28 42 32 40C36 38 40 42 44 40" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  };

  return svgs[icon] || svgs.factory;
}

/**
 * Map icon name to color
 * @param {string} icon
 * @returns {string}
 */
export function getIconColor(icon) {
  const colors = { factory: '#0078D4', leaf: '#6CCB5F', water: '#4FC3F7' };
  return colors[icon] || '#0078D4';
}
