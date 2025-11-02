"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { RotateCwSquare, Trash2 } from "lucide-react";
import { useObjectUrlRegistry } from "@/hooks/useObjectUrlRegistry";

// Інтерфейс фотографії
interface Photo {
  id: string;
  file: File;
  preview: string;
  caption: string;
  rotation: number;

  status?: "processing" | "ready" | "error";
  progress?: number;
  errorMsg?: string | null;
}

// Компонент для сортування фотографій
const SortablePhoto = ({
  photo,
  index,
  updateCaption,
  deletePhoto,
  isDragging,
  rotatePhoto,
}: {
  photo: Photo;
  index: number;
  updateCaption: (id: string, caption: string) => void;
  deletePhoto: (id: string) => void;
  isDragging: boolean;
  rotatePhoto: (id: string, angle: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: photo.id, disabled: photo.status !== "ready" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`relative flex justify-center text-center border border-gray-300 hover:border-gray-500 rounded-lg p-[5px] cursor-grab bg-white
        shadow-[0_2px_4px_rgba(0,0,0,0.1)] touch-none
        transition-[box-shadow,transform] duration-300 ease-in-out
        hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]
        ${isDragging ? "opacity-50" : ""}
        ${photo.status !== "ready" ? "cursor-wait" : "cursor-grab"}`}
      style={style}
      {...attributes}
    >
      {photo.status === "processing" && (
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-10">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span className="text-xs text-gray-700">
            {typeof photo.progress === "number"
              ? `${photo.progress}%`
              : "Обробка…"}
          </span>
        </div>
      )}
      {photo.status === "error" && (
        <div className="absolute inset-0 bg-red-50/80 flex flex-col items-center justify-center gap-2 z-10 text-red-700">
          <span className="text-xs font-medium">Помилка</span>
          <button
            className="text-xs underline"
            onClick={(e) => {
              e.stopPropagation();
              deletePhoto(photo.id);
            }}
          >
            Видалити
          </button>
        </div>
      )}
      {photo.preview ? (
        <img
          src={photo.preview}
          alt="Фотографія"
          className="max-w-full object-contain"
          style={{
            transform: `rotate(${photo.rotation}deg)`,
            maxWidth: photo.rotation % 180 !== 0 ? "390px" : "220px",
            maxHeight: photo.rotation % 180 !== 0 ? "220px" : "390px",
          }}
          {...listeners}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-gray-100 text-gray-500"
          style={{
            width: "150px",
            height: "150px",
          }}
        >
          {photo.status === "processing" ? "Обробка…" : "—"}
        </div>
      )}
      <div
        className="absolute top-1 left-1 bg-[rgba(0,0,0,0.5)] text-white
               px-1 py-0.5 text-xs"
      >
        {index + 1}
      </div>
      <button
        className="absolute top-1 right-1 bg-transparent border-0 rounded-full p-1
               cursor-pointer flex items-center justify-center
               transition-colors duration-300 ease-in-out
               hover:bg-white"
        onClick={(e) => {
          e.stopPropagation();
          deletePhoto(photo.id);
        }}
        title="Видалити"
      >
        <Trash2 size={20} className="text-red-500" />
      </button>
      <div>
        <input
          type="text"
          value={photo.caption}
          onChange={(e) => updateCaption(photo.id, e.target.value)}
          placeholder="Введіть підпис"
          className="absolute bottom-2.5 left-2.5 w-[calc(100%-48px)]
         p-1 text-xs rounded outline-none
         bg-transparent border border-transparent
         text-white placeholder:text-gray-600
         focus:bg-black focus:border-[#1a2a44] focus:placeholder:text-gray-200"
          onClick={(e) => e.stopPropagation()}
          maxLength={50}
        />
      </div>
      <button
        className="absolute bottom-4 right-2.5 bg-none border-0 text-[#000080] cursor-pointer mx-1 transition-colors duration-200 hover:text-[#1a2a44]"
        onClick={(e) => {
          e.stopPropagation();
          rotatePhoto(photo.id, 180);
        }}
        title="Повернути вправо"
      >
        <RotateCwSquare size={16} />
      </button>
    </div>
  );
};

// Компонент для попереднього перегляду PDF
const PdfPreview = ({ photos, title }: { photos: Photo[]; title: string }) => {
  const photosPerPage = 9; // Сітка 3x3
  const pages = Math.ceil(photos.length / photosPerPage);

  // Розміри сторінки в пікселях (A4: 595x842 pt, переводимо в пікселі при 96 DPI)
  const pageWidth = 600; // Ширина сторінки
  const pageHeight = 800; // Висота сторінки
  const leftPadding = 10;
  const rightPadding = 10;
  const topPadding = 10;
  const bottomPadding = 40;
  const gap = 10;

  // Розміри фотографії (вертикальна орієнтація, наприклад, 481x854)
  const photoWidth = (pageWidth - leftPadding - rightPadding - 2 * gap) / 3; // ≈ 185 px
  const photoHeight = photoWidth * (624 / 481); // ≈ 328 px
  const captionHeight = 14; // Висота підпису
  const captionGap = 15; // Відступ між фото та підписом

  // Перевірка масштабування, якщо вміст не вміщається
  const totalHeight =
    3 * (photoHeight + captionHeight + captionGap) +
    2 * gap +
    topPadding +
    bottomPadding +
    20;
  const scale = totalHeight > pageHeight ? pageHeight / totalHeight : 1;

  const scaledPhotoWidth = photoWidth * scale;
  const scaledPhotoHeight = photoHeight * scale;
  const scaledCaptionHeight = captionHeight * scale;
  const scaledCaptionGap = captionGap * scale;

  return (
    <div className="fixed top-0 left-[-10000px]">
      {Array.from({ length: pages }).map((_, pageIndex) => (
        <div
          key={pageIndex}
          id={`pdf-page-${pageIndex}`}
          className="bg-white box-border"
          style={{
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
            padding: `${topPadding}px ${rightPadding}px ${bottomPadding}px ${leftPadding}px`,
          }}
        >
          <div
            className="text-4xl font-bold text-black text-left mt-5"
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#000",
              textAlign: "left",
              marginBottom: "10px",
              paddingLeft: "24px",
            }}
          >
            {title || "Об'єкт оцінки"}
          </div>
          <div
            className="grid justify-center content-center"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(3, ${scaledPhotoWidth}px)`,
              gridTemplateRows: `repeat(3, ${
                scaledPhotoHeight + scaledCaptionHeight + scaledCaptionGap
              }px)`,
              gap: `${gap}px`,
              width: `${pageWidth - leftPadding - rightPadding}px`,
              height: `${pageHeight - topPadding - bottomPadding - 20}px`,
            }}
          >
            {photos
              .slice(pageIndex * photosPerPage, (pageIndex + 1) * photosPerPage)
              .map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative flex flex-col"
                  style={{
                    width: `${scaledPhotoWidth}px`,
                    height: `${
                      scaledPhotoHeight + scaledCaptionHeight + scaledCaptionGap
                    }px`,
                  }}
                >
                  <div
                    className="text-xs leading-[1.2] text-[#1a2a44]
                           bg-[rgba(255,255,255,0.8)] py-0.5 px-1 max-w-full
                           whitespace-normal wrap-break-word mb-1"
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
                        width: `${scaledPhotoWidth}px`,
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
};

export function VerticalPhotoReport() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Об'єкт оцінки");
  const { register, revoke, revokeAll } = useObjectUrlRegistry();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const standardizeImage = async (file: File): Promise<File> => {
    const img = new Image();
    const objectUrl = register(URL.createObjectURL(file));
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const targetWidth = 481; // Ширина для вертикальної орієнтації
    const targetHeight = 854; // Висота для вертикальної орієнтації

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d")!;

    // Якщо зображення горизонтальне, повертаємо його на 90 градусів
    if (img.width > img.height) {
      ctx.translate(targetWidth, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0, targetHeight, targetWidth);
    } else {
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    }

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
    );

    return new File([blob], file.name, { type: "image/jpeg" });
  };

  const rotatePhoto = (id: string, angle: number) => {
    setPhotos((photos) =>
      photos.map((photo) =>
        photo.id === id
          ? { ...photo, rotation: (photo.rotation + angle) % 360 }
          : photo
      )
    );
  };

  const updateTitle = (newTitle: string) => {
    setTitle(newTitle);
  };

  // Обробка завантаження файлів
  const onDrop = async (acceptedFiles: File[]) => {
    if (photos.length + acceptedFiles.length > 100) {
      setError("Максимум 100 фотографій");
      return;
    }

    setError(null);
    setIsImporting(true); // -- Додано --
    setImportProgress(0); // -- Додано --

    // Спочатку додаємо "плейсхолдери" карток зі статусом processing
    const placeholders: Photo[] = acceptedFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random()}`,
      file,
      preview: "", // ще немає прев’ю
      caption: "",
      rotation: 0,
      status: "processing",
      progress: 0,
      errorMsg: null,
    }));

    setPhotos((prev) => [...prev, ...placeholders]); // показуємо картки одразу

    // Потім обробляємо КОЖЕН файл по черзі, оновлюючи відповідну картку
    try {
      const total = acceptedFiles.length;
      for (let i = 0; i < total; i++) {
        const file = acceptedFiles[i];
        const placeholderId = placeholders[i].id;

        // прогрес компресії від бібліотеки (грубий %)
        let lastCompressionProgress = 0;

        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            // -- Додано: колбек прогресу компресії --
            onProgress: (p) => {
              lastCompressionProgress = Math.min(
                Math.max(Math.round(p), 0),
                100
              );
              // оновлюємо локальний прогрес картки
              setPhotos((prev) =>
                prev.map((ph) =>
                  ph.id === placeholderId
                    ? { ...ph, progress: lastCompressionProgress }
                    : ph
                )
              );
            },
          });

          const standardizedFile = await standardizeImage(compressedFile);

          // створюємо прев’ю і позначаємо як ready
          const previewUrl = register(URL.createObjectURL(standardizedFile));

          setPhotos((prev) =>
            prev.map((ph) =>
              ph.id === placeholderId
                ? {
                    ...ph,
                    file: standardizedFile,
                    preview: previewUrl,
                    status: "ready",
                    progress: 100,
                  }
                : ph
            )
          );
        } catch (e: unknown) {
          const message =
            e instanceof Error
              ? e.message
              : typeof e === "string"
              ? e
              : "Невідома помилка під час обробки файлу";

          console.error("Помилка:", message);
          setPhotos((prev) =>
            prev.map((ph) =>
              ph.id === placeholderId
                ? { ...ph, status: "error", errorMsg: message }
                : ph
            )
          );
        }

        // глобальний прогрес імпорту
        const overall = Math.round(((i + 1) / total) * 100);
        setImportProgress(overall);
        // даємо браузеру перемалювати прогрес
        await new Promise(requestAnimationFrame);
      }
    } finally {
      // при будь-якому результаті знімаємо флаг імпорту
      setIsImporting(false);
      // залишимо останнє значення, або можна обнулити:
      // setImportProgress(null);
    }
  };

  // Оновлення підпису
  const updateCaption = (id: string, caption: string) => {
    setPhotos(
      photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo))
    );
  };

  // Видалення фото
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

  // Обробка початку перетягування
  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Обробка завершення перетягування
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

  const yieldToBrowser = async () => {
    await new Promise(requestAnimationFrame);
    await new Promise<void>((r) => setTimeout(r, 0));
  };

  // Генерація PDF
  const generatePDF = async () => {
    if (isGenerating) return;
    if (photos.length === 0) {
      setError("Немає фотографій для експорту");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const photosPerPage = 9;
      const pages = Math.ceil(photos.length / photosPerPage);

      for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
        const pageElement = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageElement) {
          console.error(`Сторінка ${pageIndex} не знайдена`);
          continue;
        }

        setProgress(Math.round((pageIndex / pages) * 100));
        await yieldToBrowser();

        const canvas = await html2canvas(pageElement, {
          scale: Math.min(Math.max(window.devicePixelRatio || 1, 2), 3), // 2..3
          useCORS: true,
          backgroundColor: "#fff",
          imageTimeout: 0,
          removeContainer: true,
          // scrollY: 0,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.92);

        const imgWidth = 440;
        const imgHeight = 625;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

        setProgress(Math.round(((pageIndex + 1) / pages) * 100));
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

  const activePhoto = photos.find((photo) => photo.id === activeId);

  const hasUnready = photos.some((p) => p.status !== "ready");

  return (
    <div className="p-5 max-w-6xl m-auto">
      <h1 className="text-3xl text-[#1a2a44] mb-5">Створення фотозвіту</h1>
      <div className="my-5 flex flex-col items-center justify-center">
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
        className={`border-dashed border-2 border-[#1a2a44] rounded-lg p-5 text-center cursor-pointer 
    ${isDragActive ? "bg-gray-200" : ""}
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-1.5 mt-5 max-w-full overflow-x-hidden relative">
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
    relative text-center border border-gray-300 p-[5px] bg-white 
    shadow-[0_4px_12px_rgba(0,0,0,0.2)] z-100 cursor-grabbing opacity-90
  "
            >
              <img
                src={activePhoto.preview}
                alt="Фотографія"
                style={{ transform: `rotate(${activePhoto.rotation}deg)` }}
                className="max-w-full object-contain"
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
      <PdfPreview photos={photos} title={title} />
    </div>
  );
}
