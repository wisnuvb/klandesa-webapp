"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

/** Skala tampilan kertas saat ini; kontrol di atas kertas diberi skala balik agar tetap terbaca. */
export const ScaleContext = createContext(1);
export const useScale = () => useContext(ScaleContext);

/** Membungkus elemen antarmuka (label, tombol, catatan) di dalam kertas agar ukurannya tidak ikut mengecil. */
export function Unscaled({
  children,
  className,
  style,
  origin = "top left",
  flow = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  origin?: string;
  /** true: elemen ikut aliran tata letak (memakai `zoom` agar tingginya benar); false: elemen melayang (transform). */
  flow?: boolean;
}) {
  const scale = useScale();
  if (scale >= 0.999 && scale <= 1.001) return <div className={className} style={style}>{children}</div>;
  if (flow) {
    return (
      <div className={className} style={{ ...style, zoom: 1 / scale }}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={className}
      style={{ ...style, transform: `scale(${1 / scale})`, transformOrigin: origin, width: `${scale * 100}%` }}
    >
      {children}
    </div>
  );
}
