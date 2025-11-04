"use client";

import type { Photo } from "./types";
import { makePager } from "./paging";

type Padding = { left: number; right: number; top: number; bottom: number };

type Props = {
  photos: Photo[];
  title: string;
  pageWidth: number;
  pageHeight: number;
  padding: Padding;
  gap: number;
  columns: number;
  rows: number;
  ratioHPerW: number;
  photosPerPage: number;
  titleBlockExtraPx: number;
  titleMarginTopPx: number;
  captionHeightPx: number;
  captionGapPx: number;
};

export function ReportPreview({
  photos,
  title,
  pageWidth,
  pageHeight,
  padding,
  gap,
  columns,
  rows,
  ratioHPerW,
  photosPerPage,
  titleBlockExtraPx,
  titleMarginTopPx,
  captionHeightPx,
  captionGapPx,
}: Props) {
  const { pages } = makePager(photos, photosPerPage);

  // Базова “не масштабована” ширина фото = ширина контентної області / columns
  const contentWidth = pageWidth - padding.left - padding.right;
  const cellWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cellHeight = cellWidth * ratioHPerW + captionHeightPx + captionGapPx; // фото + підпис + відступ підпису

  // Загальна висота всього гріда + заголовок/відступи
  const totalHeight =
    rows * cellHeight +
    gap * (rows - 1) +
    padding.top +
    padding.bottom +
    titleBlockExtraPx;

  // Якщо не влазить — рівномірно скейлимо всю сітку
  const scale = totalHeight > pageHeight ? pageHeight / totalHeight : 1;

  const scaledCellWidth = cellWidth * scale;
  const scaledPhotoHeight = scaledCellWidth * ratioHPerW;
  const scaledCaptionHeight = captionHeightPx * scale;
  const scaledCaptionGap = captionGapPx * scale;

  return (
    <div className="fixed top-0 left-[-10000px]">
      {pages.map(({ pageIndex, id, slice }) => (
        <div
          key={id}
          id={id}
          className="bg-white box-border"
          style={{
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
            padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
          }}
        >
          {/* Заголовок */}
          <div
            className="text-3xl! font-bold text-black text-left mb-2.5"
            style={{
              marginTop: `${titleMarginTopPx}px`,
            }}
          >
            {title || "Об'єкт оцінки"}
          </div>

          {/* Ґрід */}
          <div
            className="grid justify-center content-center"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, ${scaledCellWidth}px)`,
              gridTemplateRows: `repeat(${rows}, ${
                scaledPhotoHeight + scaledCaptionHeight + scaledCaptionGap
              }px)`,
              gap: `${gap}px`,
              width: `${contentWidth}px`,
              height: `${
                pageHeight - padding.top - padding.bottom - titleBlockExtraPx
              }px`,
            }}
          >
            {slice.map((photo, i) => (
              <div
                key={photo.id}
                className="relative flex flex-col"
                style={{
                  width: `${scaledCellWidth}px`,
                  height: `${
                    scaledPhotoHeight + scaledCaptionHeight + scaledCaptionGap
                  }px`,
                }}
              >
                <div
                  className="text-lg! leading-[1.2] text-[#1a2a44]
                           bg-[rgba(255,255,255,0.8)] pb-0.5 px-1 max-w-full
                           whitespace-normal wrap-break-word mb-2"
                >
                  {photo.caption ||
                    `Фотографія №${i + 1 + pageIndex * photosPerPage}`}
                </div>
                {photo.preview ? (
                  <img
                    src={photo.preview}
                    alt="Фотографія"
                    className="w-full object-contain m-auto"
                    style={{
                      width: `${scaledCellWidth}px`,
                      height: `${scaledPhotoHeight}px`,
                      transform: `rotate(${photo.rotation}deg)`,
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
