import imageCompression from "browser-image-compression";
import { getErrorMessage, yieldToBrowser, patchById } from "./utils";
import type { Photo } from "./types";

type SetPhotos = React.Dispatch<React.SetStateAction<Photo[]>>;

interface Args {
  register: (url: string) => string;
  setPhotos: SetPhotos;
  setIsImporting: (v: boolean) => void;
  setImportProgress: (v: number | null) => void;
  currentCount: number;
  maxCount?: number;
  standardizeImage: (f: File) => Promise<File>;
}

export function useImagePipeline({
  register,
  setPhotos,
  setIsImporting,
  setImportProgress,
  currentCount,
  maxCount = 100,
  standardizeImage,
}: Args) {
  const patchPhoto = patchById<Photo>(setPhotos);

  const importImages = async (acceptedFiles: File[]) => {
    if (currentCount + acceptedFiles.length > maxCount) {
      throw new Error(`Максимум ${maxCount} фотографій`);
    }

    setIsImporting(true);
    setImportProgress(0);

    // 1) створюємо плейсхолдери
    const placeholders: Photo[] = acceptedFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random()}`,
      file,
      preview: "",
      caption: "",
      rotation: 0,
      status: "processing",
      progress: 0,
      errorMsg: null,
    }));

    setPhotos((prev) => [...prev, ...placeholders]);

    try {
      const total = acceptedFiles.length;

      for (let i = 0; i < total; i++) {
        const file = acceptedFiles[i];
        const placeholderId = placeholders[i].id;

        try {
          let lastCompressionProgress = 0;

          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            onProgress: (p) => {
              lastCompressionProgress = Math.min(
                Math.max(Math.round(p), 0),
                100
              );
              patchPhoto(placeholderId, { progress: lastCompressionProgress });
            },
          });

          const standardizedFile = await standardizeImage(compressedFile);
          const previewUrl = register(URL.createObjectURL(standardizedFile));

          patchPhoto(placeholderId, {
            file: standardizedFile,
            preview: previewUrl,
            status: "ready",
            progress: 100,
          });
        } catch (e: unknown) {
          const message = getErrorMessage(e);
          patchPhoto(placeholderId, { status: "error", errorMsg: message });
        }

        const overall = Math.round(((i + 1) / total) * 100);
        setImportProgress(overall);
        await yieldToBrowser();
      }
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return { importImages };
}
