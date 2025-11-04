"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { RotateCwSquare, Trash2 } from "lucide-react";
import type { Photo } from "./types";

type Props = {
  photo: Photo;
  index: number;
  isDragging: boolean;
  updateCaption: (id: string, caption: string) => void;
  deletePhoto: (id: string) => void;
  rotatePhoto: (id: string, angle: number) => void;
};

export function SortablePhoto({
  photo,
  index,
  isDragging,
  updateCaption,
  deletePhoto,
  rotatePhoto,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: photo.id, disabled: photo.status !== "ready" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`relative flex justify-center text-center border border-gray-300 hover:border-gray-500 rounded-lg p-[5px] bg-white
        shadow-[0_2px_4px_rgba(0,0,0,0.1)] touch-none
        transition-[box-shadow,transform] duration-300 ease-in-out
        hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]
        ${isDragging ? "opacity-50" : ""}
        ${photo.status !== "ready" ? "cursor-wait" : "cursor-grab"}`}
      style={style}
      {...attributes}
    >
      {/* processing overlay */}
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

      {/* error overlay */}
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

      {/* image or placeholder */}
      {photo.preview ? (
        <div>
          <img
            src={photo.preview}
            alt="Фотографія"
            className="object-contain"
            style={{
              transform: `rotate(${photo.rotation}deg)`,
              maxWidth: photo.rotation % 180 !== 0 ? "390px" : "220px",
              maxHeight: photo.rotation % 180 !== 0 ? "220px" : "390px",
            }}
            {...listeners}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center bg-gray-100 text-gray-500"
          style={{ width: "150px", height: "150px" }}
        >
          {photo.status === "processing" ? "Обробка…" : "—"}
        </div>
      )}

      {/* index badge */}
      <div className="absolute top-1 left-1 bg-[rgba(0,0,0,0.5)] text-white px-1 py-0.5 text-xs">
        {index + 1}
      </div>

      {/* delete */}
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

      {/* caption */}
      <div>
        <input
          type="text"
          value={photo.caption}
          onChange={(e) => updateCaption(photo.id, e.target.value)}
          placeholder="Введіть назву..."
          className="absolute bottom-2.5 left-2.5 w-fit
         p-1 text-xs rounded outline-none
         bg-gray-50/20 border border-stone-200/50
         text-white placeholder:text-gray-600
         focus:bg-black focus:border-[#1a2a44] focus:placeholder:text-gray-200"
          onClick={(e) => e.stopPropagation()}
          maxLength={36}
        />
      </div>

      {/* rotate */}
      <button
        className="absolute bottom-3 right-1.5 bg-none border-0 text-[#000080] cursor-pointer mx-1 transition-colors duration-200 hover:text-[#1a2a44] bg-gray-50/50 p-1 rounded-full"
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
}
