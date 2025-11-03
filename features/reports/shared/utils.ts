export const getErrorMessage = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "string"
    ? e
    : "Невідома помилка";

export const yieldToBrowser = async () => {
  await new Promise(requestAnimationFrame);
  await new Promise<void>((r) => setTimeout(r, 0));
};

// Хелпер для патчів по id → знімає дублювання setPhotos(map...)
export type PhotoPatch<T> = Partial<T>;
export const patchById =
  <T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>) =>
  (id: string, patch: PhotoPatch<T>) =>
    set((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
