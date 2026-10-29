import type { Metadata } from "next";
import { MixedPhotoReport } from "@/components/shared/mixed-photo-report";

export const metadata: Metadata = {
  title: "Змішаний фотозвіт",
  description: "Фотозвіт із горизонтальними та вертикальними фото",
};

export default function MixedPhotos() {
  return <MixedPhotoReport />;
}
