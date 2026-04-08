"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import Image from "next/image";

type Props = {
  open: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
};

export default function UkmImagePreviewModal(props: Props) {
  const { open, images, currentIndex, onClose, onSelectIndex } = props;
  const src = images[currentIndex];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full"
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-white rounded-xl overflow-hidden">
              {src && (
                <Image
                  src={src}
                  alt="Preview"
                  className="w-full h-auto"
                  width={900}
                  height={900}
                />
              )}
              {images.length > 1 && (
                <div className="p-4 flex items-center justify-center gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => onSelectIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentIndex ? "bg-teal-600" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

