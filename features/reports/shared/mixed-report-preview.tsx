"use client";

import type { Photo } from "./types";
import { makePager } from "./paging";
import { LAYOUT_MIXED } from "./layout";

const IMAGE_HEIGHT = 400;
const CAPTION_HEIGHT = 42;

function photoRatio(photo: Photo): number {
  return photo.width && photo.height ? photo.width / photo.height : 1;
}

function pairWidths(first: Photo, second: Photo, available: number): [number, number] {
  const firstShare = photoRatio(first) / (photoRatio(first) + photoRatio(second));
  const constrained = Math.max(0.3, Math.min(0.7, firstShare));
  return [available * constrained, available * (1 - constrained)];
}

function fittedSize(photo: Photo, cellWidth: number) {
  const ratio = photoRatio(photo);
  const width = Math.min(cellWidth, IMAGE_HEIGHT * ratio);
  return { width, height: width / ratio };
}

export function MixedReportPreview({
  photos,
  title,
  layout,
}: {
  photos: Photo[];
  title: string;
  layout: typeof LAYOUT_MIXED;
}) {
  const { pages } = makePager(photos, layout.PHOTOS_PER_PAGE);
  const contentWidth = layout.PAGE_WIDTH - layout.PADDING.left - layout.PADDING.right;

  return (
    <div className="fixed top-0 left-[-10000px]">
      {pages.map(({ id, pageIndex, slice }) => (
        <div
          key={id}
          id={id}
          className="box-border bg-white text-[#1a2a44]"
          style={{
            width: layout.PAGE_WIDTH,
            height: layout.PAGE_HEIGHT,
            padding: `${layout.PADDING.top}px ${layout.PADDING.right}px ${layout.PADDING.bottom}px ${layout.PADDING.left}px`,
          }}
        >
          <h2 className="m-0 mb-8 h-[58px] overflow-hidden text-[30px] font-bold leading-[1.2]">
            {title || "Об'єкт оцінки"}
          </h2>
          <div className="flex flex-col" style={{ gap: layout.GRID_GAP }}>
            {[0, 2, 4].map((start) => {
              const pair = slice.slice(start, start + 2);
              if (pair.length === 0) return null;
              const available = contentWidth - (pair.length === 2 ? layout.GRID_GAP : 0);
              const widths: [number, number] = pair.length === 2
                ? pairWidths(pair[0], pair[1], available)
                : [available, 0];

              return (
                <div key={start} className="flex" style={{ gap: layout.GRID_GAP }}>
                  {pair.map((photo, index) => (
                    <div key={photo.id} className="flex flex-col" style={{ width: widths[index] }}>
                      <div className="flex items-center justify-center bg-[#f5f6f7]" style={{ height: IMAGE_HEIGHT }}>
                        {photo.preview && (
                          <img
                            src={photo.preview}
                            alt="Фотографія"
                            className="block"
                            style={{ ...fittedSize(photo, widths[index]), transform: `rotate(${photo.rotation}deg)` }}
                          />
                        )}
                      </div>
                      <div
                        className="overflow-hidden px-1 pt-1 text-[17px] leading-[19px] wrap-break-word"
                        style={{ height: CAPTION_HEIGHT }}
                      >
                        {photo.caption || `Фотографія №${pageIndex * layout.PHOTOS_PER_PAGE + start + index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
