import { HorizontalPhotoReport } from "@/components/shared";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сортування фото",
  description: "Сортування фото для звітів",
};

export default function SortPhotos() {
  return <HorizontalPhotoReport />;
}
