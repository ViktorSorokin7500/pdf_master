"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  useImagePipeline,
  createJsPdfPortraitA4,
  captureNodeToJpeg,
  addFullPageImage,
  yieldToBrowser,
  makePager,
  Photo,
  SortablePhoto,
  ReportPreview,
} from "@/features/reports/shared";
import { useObjectUrlRegistry } from "@/hooks/useObjectUrlRegistry";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

interface LayoutConfig {
  NAME: string;
  PHOTOS_PER_PAGE: number;
  PAGE_WIDTH: number;
  PAGE_HEIGHT: number;
  PADDING: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  GRID_GAP: number;
  PDF_IMG: {
    width: number;
    height: number;
  };
  TARGET_WIDTH: number;
  TARGET_HEIGHT: number;
  COLUMNS: number;
  ROWS: number;
  RATIOHPERW1: number;
  RATIOHPERW2: number;
  TITLE_BLOCK: number;
  TITLE_MARGIN: number;
  CAPTION_HEIGHT: number;
  CAPTION_GAP: number;
}

interface PhotoReportProps {
  layoutConfig: LayoutConfig;
}

export function PhotoReport({ layoutConfig }: PhotoReportProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("Об'єкт оцінки");
  const { register, revoke, revokeAll } = useObjectUrlRegistry();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const updateTitle = (newTitle: string) => setTitle(newTitle);

  const standardizeImage = async (file: File): Promise<File> => {
    const tempUrl = URL.createObjectURL(file);
    try {
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = tempUrl;
      });

      const targetWidth = layoutConfig.TARGET_WIDTH;
      const targetHeight = layoutConfig.TARGET_HEIGHT;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d")!;
      if (layoutConfig.NAME === "horizontal") {
        if (img.width < img.height) {
          ctx.translate(0, targetHeight);
          ctx.rotate(-Math.PI / 2);

          ctx.drawImage(img, 0, 0, targetHeight, targetWidth);
        } else {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }
      }
      if (layoutConfig.NAME === "vertical") {
        if (img.width > img.height) {
          ctx.translate(targetWidth, 0);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, 0, 0, targetHeight, targetWidth);
        } else {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }
      }

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
      );

      return new File([blob], file.name, { type: "image/jpeg" });
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  };

  const { importImages } = useImagePipeline({
    register,
    setPhotos,
    setIsImporting,
    setImportProgress,
    currentCount: photos.length,
    maxCount: 100,
    standardizeImage,
  });

  const rotatePhoto = (id: string, angle: number) => {
    setPhotos((photos) =>
      photos.map((photo) =>
        photo.id === id
          ? { ...photo, rotation: (photo.rotation + angle) % 360 }
          : photo
      )
    );
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (photos.length + acceptedFiles.length > 100) {
      setError("Максимум 100 фотографій");
      return;
    }
    setError(null);
    await importImages(acceptedFiles);
  };

  const updateCaption = (id: string, caption: string) => {
    setPhotos(
      photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo))
    );
  };

  const deletePhoto = (id: string) => {
    const p = photos.find((p) => p.id === id);
    if (p?.preview) revoke(p.preview);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const cleanAll = () => {
    revokeAll();
    setPhotos([]);
    setError(null);
    setActiveId(null);
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setPhotos((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const generatePDF = async () => {
    if (isGenerating) return;
    if (photos.length === 0) {
      setError("Немає фотографій для експорту");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const pdf = createJsPdfPortraitA4();
      const photosPerPage = layoutConfig.PHOTOS_PER_PAGE;
      const { total, pages } = makePager(photos, photosPerPage);

      for (let i = 0; i < total; i++) {
        const { id: pageId } = pages[i];
        const pageElement = document.getElementById(
          pageId
        ) as HTMLElement | null;
        if (!pageElement) {
          console.error(`Сторінка ${i} не знайдена`);
          continue;
        }
        setProgress(Math.round((i / total) * 100));
        await yieldToBrowser();
        const imgData = await captureNodeToJpeg(pageElement);
        const { width, height } = layoutConfig.PDF_IMG;
        if (i > 0) pdf.addPage();
        addFullPageImage(pdf, imgData, { width, height });
        setProgress(Math.round(((i + 1) / total) * 100));
        await yieldToBrowser();
      }
      setProgress(100);
      await yieldToBrowser();
      pdf.save("photo-report.pdf");
    } catch (e) {
      console.error(e);
      setError("Сталася помилка під час генерації PDF");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    multiple: true,
  });

  // Активне фото (перетягування)
  const activePhoto = photos.find((photo) => photo.id === activeId);
  const hasUnready = photos.some((p) => p.status !== "ready");

  return (
    <div className="p-5 max-w-6xl m-auto">
      <h1 className="text-3xl text-[#1a2a44] mb-5">Створення фотозвіту</h1>
      <div className="my-5 flex justify-center">
        <input
          type="text"
          value={title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Введіть заголовок (наприклад, Об'єкт оцінки)"
          className="w-full max-w-[400px] border border-[#e0e0e0] rounded-lg p-2 text-sm text-[#1a2a44] focus:outline-none focus:border-[#1a2a44] placeholder:text-gray-400"
          maxLength={100}
        />
      </div>
      {isImporting && (
        <div className="w-full max-w-[400px] mx-auto mt-2" aria-live="polite">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-[#1a2a44] rounded"
              style={{
                width: `${importProgress ?? 0}%`,
                transition: "width 150ms linear",
              }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1 text-center">
            Імпорт фото… {importProgress ?? 0}%
          </div>
        </div>
      )}
      <div
        {...getRootProps()}
        className={`border-dashed border-2 border-[#1a2a44] rounded-lg p-5 text-center cursor-pointer ${
          isDragActive ? "bg-gray-200" : ""
        }
      ${isImporting ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />
        <p>
          Перетягніть фотографії сюди або натисніть для вибору (до 100 файлів)
        </p>
      </div>
      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <SortableContext items={photos.map((photo) => photo.id)}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 mt-5 max-w-full overflow-x-hidden relative">
            {photos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                index={index}
                updateCaption={updateCaption}
                deletePhoto={deletePhoto}
                rotatePhoto={rotatePhoto}
                isDragging={activeId === photo.id}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activePhoto && (
            <div
              className="
      relative flex justify-center rounded-lg text-center border border-gray-600 p-[5px] bg-white 
      shadow-[0_4px_12px_rgba(0,0,0,0.2)] z-100 cursor-grabbing opacity-90
    "
            >
              <img
                src={activePhoto.preview}
                alt="Фотографія"
                style={{ transform: `rotate(${activePhoto.rotation}deg)` }}
                className="max-h-[400px] object-contain"
              />
              <div
                className="
        absolute top-[5px] left-[5px] bg-[rgba(0,0,0,0.5)] text-white 
        px-[5px] py-0.5 text-[12px]
      "
              >
                {photos.findIndex((p) => p.id === activeId) + 1}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {isGenerating && (
        <div className="w-full max-w-[400px] mx-auto mt-2" aria-live="polite">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-[#1a2a44] rounded"
              style={{
                width: `${progress ?? 0}%`,
                transition: "width 200ms linear",
              }}
            />
          </div>
        </div>
      )}
      {photos.length > 0 && (
        <div className="flex justify-center gap-2.5 my-5 mx-auto">
          <button
            onClick={generatePDF}
            disabled={isGenerating || isImporting || hasUnready}
            aria-busy={isGenerating}
            className={`cursor-pointer px-5 py-2.5 rounded text-sm transition-colors duration-300 ease-in-out
          ${
            isGenerating
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-[#1a2a44] hover:bg-[#0e1a2f] text-white"
          }`}
          >
            {isGenerating
              ? progress !== null
                ? `Генерація… ${progress}%`
                : "Генерація…"
              : "Створити PDF"}
          </button>

          <button
            onClick={cleanAll}
            disabled={isGenerating || isImporting}
            className={`cursor-pointer py-2.5 px-5 text-white border-0 rounded text-base transition-colors duration-300 ease-in-out
          ${
            isGenerating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
          >
            Видалити всі фото
          </button>
        </div>
      )}
      <ReportPreview
        photos={photos}
        title={title}
        pageWidth={layoutConfig.PAGE_WIDTH}
        pageHeight={layoutConfig.PAGE_HEIGHT}
        padding={layoutConfig.PADDING}
        gap={layoutConfig.GRID_GAP}
        columns={layoutConfig.COLUMNS}
        rows={layoutConfig.ROWS}
        ratioHPerW={layoutConfig.RATIOHPERW1 / layoutConfig.RATIOHPERW2} // як у твоїх розрахунках для горизонтального
        photosPerPage={layoutConfig.PHOTOS_PER_PAGE}
        titleBlockExtraPx={layoutConfig.TITLE_BLOCK} // як було у формулі (- 180px)
        titleMarginTopPx={layoutConfig.TITLE_MARGIN} // mt-20 для горизонтальної
        captionHeightPx={layoutConfig.CAPTION_HEIGHT}
        captionGapPx={layoutConfig.CAPTION_GAP}
      />
    </div>
  );
}
