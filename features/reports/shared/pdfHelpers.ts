import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const JPEG_QUALITY = 0.92;

export const html2canvasScale = () =>
  Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);

export async function captureNodeToJpeg(node: HTMLElement): Promise<string> {
  const canvas = await html2canvas(node, {
    scale: html2canvasScale(),
    useCORS: true,
    backgroundColor: "#fff",
    imageTimeout: 0,
    removeContainer: true,
  });
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function createJsPdfPortraitA4() {
  return new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: "a4",
  });
}

export function addFullPageImage(
  pdf: jsPDF,
  imgData: string,
  size: { width: number; height: number }
) {
  pdf.addImage(imgData, "JPEG", 0, 0, size.width, size.height);
}
