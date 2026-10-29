"use client";

import { useMemo, type ReactNode } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

export type AnchorRect = { x: number; y: number; width: number; height: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Posisi jangkar dalam koordinat layar (viewport), mis. dari `coordsAtPos` atau `getBoundingClientRect`. */
  anchor: AnchorRect;
  children: ReactNode;
  className?: string;
  /** Dipanggil saat fokus akan dikembalikan; panggil `preventDefault` lalu fokuskan elemen sendiri. */
  onCloseAutoFocus?: (e: Event) => void;
  label: string;
};

/** Popover Radix berjangkar titik/kotak virtual — dipakai di dalam kertas yang diskalakan (transform). */
export function AnchoredPopover({ open, onOpenChange, anchor, children, className, onCloseAutoFocus, label }: Props) {
  const { x, y, width, height } = anchor;
  const virtualRef = useMemo(
    () => ({ current: { getBoundingClientRect: () => DOMRect.fromRect({ x, y, width, height }) } }),
    [x, y, width, height],
  );
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        aria-label={label}
        className={className ?? "w-80 p-0"}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
