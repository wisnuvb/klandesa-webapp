import { useState } from "react";

export function useImagePreview() {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openPreview = (images: string[], index: number = 0) => {
    setImages(images);
    setCurrentIndex(index);
    setOpen(true);
  };

  const closePreview = () => setOpen(false);

  return {
    open,
    images,
    currentIndex,
    setCurrentIndex,
    openPreview,
    closePreview,
  };
}