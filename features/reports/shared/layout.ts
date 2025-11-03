export const LAYOUT_VERTICAL = {
  PAGE_WIDTH: 600,
  PAGE_HEIGHT: 800,
  PADDING: { top: 10, right: 10, bottom: 40, left: 10 },
  GRID_GAP: 10,
  PHOTOS_PER_PAGE: 9,
  PDF_IMG: { width: 440, height: 625 },
} as const;

export const LAYOUT_HORIZONTAL = {
  PHOTOS_PER_PAGE: 8,
  PDF_IMG: { width: 440, height: 625 },

  PAGE_WIDTH: 1200,
  PAGE_HEIGHT: 1600,
  PADDING: { top: 10, right: 20, bottom: 10, left: 110 },
  GRID_GAP: 10,
} as const;
