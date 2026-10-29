export interface Photo {
  id: string;
  file: File;
  preview: string;
  caption: string;
  rotation: number;
  width?: number;
  height?: number;

  status?: "processing" | "ready" | "error";
  progress?: number;
  errorMsg?: string | null;
}
