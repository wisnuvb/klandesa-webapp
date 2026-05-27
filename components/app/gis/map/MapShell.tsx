import { cn } from "@/components/ui/utils";
import {
  MAP_DEFAULT_HEIGHT,
  MAP_DEFAULT_MIN_HEIGHT_PX,
} from "@/lib/gis/map/constants";

type MapShellProps = {
  children?: React.ReactNode;
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  height?: string;
  minHeightPx?: number;
};

export function MapShell({
  children,
  mapContainerRef,
  className,
  height = MAP_DEFAULT_HEIGHT,
  minHeightPx = MAP_DEFAULT_MIN_HEIGHT_PX,
}: MapShellProps) {
  return (
    <div
      className={cn("village-map-shell border relative", className)}
      style={{ height, minHeight: minHeightPx }}
    >
      <div ref={mapContainerRef} className="h-full w-full" data-map-container />
      {children}
    </div>
  );
}
