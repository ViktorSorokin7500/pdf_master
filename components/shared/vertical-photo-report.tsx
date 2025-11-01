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

// Інтерфейс фотографії
interface Photo {
  id: string;
  file: File;
  preview: string;
  caption: string;
  rotation: number;
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
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        className={`relative text-center border border-gray-300 p-[5px] cursor-grab bg-white
              shadow-[0_2px_4px_rgba(0,0,0,0.1)] touch-none
              transition-[box-shadow,transform] duration-300 ease-in-out
              hover:-translate-y-0,5 hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]
              ${isDragging ? "opacity-50" : ""}`}
        style={style}
        {...attributes}
      >
        <img
          src={photo.preview}
          alt="Фотографія"
          className="max-w-full max-h-[150px] object-contain"
          style={{
            transform: `rotate(${photo.rotation}deg)`,
            // Корекція розмірів при повороті
            maxWidth: photo.rotation % 180 !== 0 ? "390px" : "220px",
            maxHeight: photo.rotation % 180 !== 0 ? "220px" : "390px",
          }}
          {...listeners}
        />
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
            className="text-4xl font-bold text-black text-left mt-20"
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
                    className="text-lg leading-[1.2] text-[#1a2a44]
                           bg-[rgba(255,255,255,0.8)] py-0.5 px-1 max-w-full
                           whitespace-normal wrap-break-word mb-1"
                  >
                    {photo.caption ||
                      `Фотографія №${i + 1 + pageIndex * photosPerPage}`}
                  </div>
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
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Основний компонент сторінки
export function VerticalPhotoReport() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // Для DragOverlay
  const [title, setTitle] = useState<string>("Об'єкт оцінки");
  // Стандартизація зображення до 854x481
  const standardizeImage = async (file: File): Promise<File> => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = objectUrl;
    });

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

    URL.revokeObjectURL(objectUrl);
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
    const compressedPhotos = await Promise.all(
      acceptedFiles.map(async (file) => {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          const standardizedFile = await standardizeImage(compressedFile);

          return {
            id: `${Date.now()}-${Math.random()}`,
            file: standardizedFile,
            preview: URL.createObjectURL(standardizedFile),
            caption: "",
            rotation: 0,
          };
        } catch (err) {
          console.error("Помилка обробки:", err);
          return null;
        }
      })
    );

    const validPhotos = compressedPhotos.filter(
      (photo) => photo !== null
    ) as Photo[];
    setPhotos([...photos, ...validPhotos]);
  };

  // Оновлення підпису
  const updateCaption = (id: string, caption: string) => {
    setPhotos(
      photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo))
    );
  };

  // Видалення фото
  const deletePhoto = (id: string) => {
    setPhotos(photos.filter((photo) => photo.id !== id));
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

  // Генерація PDF
  const generatePDF = async () => {
    if (photos.length === 0) {
      setError("Немає фотографій для експорту");
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt", // Використовуємо пункти для A4
      format: "a4", // 595x842 pt
    });

    const photosPerPage = 9;
    const pages = Math.ceil(photos.length / photosPerPage);

    for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
      const pageElement = document.getElementById(`pdf-page-${pageIndex}`);
      if (!pageElement) {
        console.error(`Сторінка ${pageIndex} не знайдена`);
        continue;
      }

      const canvas = await html2canvas(pageElement, {
        scale: 2, // Підвищена роздільна здатність для чіткості
        useCORS: true,
        windowWidth: 595, // A4 ширина в пунктах
        windowHeight: 842, // A4 висота в пунктах
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const imgWidth = 595; // Ширина A4 в пунктах
      const imgHeight = 842; // Висота A4 в пунктах

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    }

    pdf.save("photo-report.pdf");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    multiple: true,
  });

  const activePhoto = photos.find((photo) => photo.id === activeId);

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
      <div
        {...getRootProps()}
        className={`border-dashed border-2 border-[#1a2a44] rounded-lg p-5 text-center cursor-pointer ${
          isDragActive ? "bg-gray-200" : ""
        }`}
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
                className="max-w-full max-h-[150px] object-contain"
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
      {photos.length > 0 && (
        <div className="flex justify-center gap-2.5 my-5 mx-auto">
          <button
            onClick={generatePDF}
            className="px-5 py-2.5 bg-[#1a2a44] text-white border-none rounded text-sm cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#0e1a2f]"
          >
            Створити PDF
          </button>
          <button
            onClick={() => setPhotos([])}
            className="py-2.5 px-5 bg-red-500 text-white border-0 rounded text-base cursor-pointer transition-colors duration-300 ease-in-out hover:bg-red-600"
          >
            Видалити всі фото
          </button>
        </div>
      )}
      <PdfPreview photos={photos} title={title} />
    </div>
  );
}
