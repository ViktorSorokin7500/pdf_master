import { LAYOUT_HORIZONTAL, LAYOUT_VERTICAL } from "./layout"; // Ваш файл layout.ts

export type ReportConfig = {
  imageStandardization: {
    targetWidth: number;
    targetHeight: number;
    ratioHPerW: number;
  };
  layout: typeof LAYOUT_HORIZONTAL | typeof LAYOUT_VERTICAL;
  columns: number;
  rows: number;
  titleBlockExtraPx: number;
};

export const HORIZONTAL_REPORT_CONFIG: ReportConfig = {
  imageStandardization: {
    targetWidth: 854,
    targetHeight: 481,
    ratioHPerW: 481 / 854,
  },
  layout: LAYOUT_HORIZONTAL,
  columns: 2,
  rows: 4,
  titleBlockExtraPx: 10,
};

export const VERTICAL_REPORT_CONFIG: ReportConfig = {
  imageStandardization: {
    targetWidth: 481,
    targetHeight: 854,
    ratioHPerW: 854 / 481,
  },
  layout: LAYOUT_VERTICAL,
  columns: 3,
  rows: 3,
  titleBlockExtraPx: 40,
};
