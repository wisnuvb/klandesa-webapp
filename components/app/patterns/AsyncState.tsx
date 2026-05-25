import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AsyncStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  onRetry?: () => void;
  minHeight?: string;
  children: ReactNode;
};

export function AsyncState({
  loading = false,
  error = null,
  empty = false,
  loadingMessage = "Memuat data...",
  emptyMessage = "Belum ada data",
  emptyTitle = "Data kosong",
  onRetry,
  minHeight = "70vh",
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight }}
      >
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight }}
      >
        <div className="text-center space-y-4">
          <div className="text-destructive text-4xl mb-2">!</div>
          <h3 className="text-lg font-semibold">Gagal memuat data</h3>
          <p className="text-muted-foreground">{error}</p>
          {onRetry ? <Button onClick={onRetry}>Coba Lagi</Button> : null}
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "40vh" }}
      >
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{emptyTitle}</h3>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
