export interface Photo {
  id: string;
  file: File;
  preview: string;
  caption: string;
  rotation: number;

  status?: "processing" | "ready" | "error";
  progress?: number;
  errorMsg?: string | null;
}
