import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState(props: ErrorStateProps) {
  const { message, onRetry } = props;

  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center space-y-4">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <h3 className="text-lg font-semibold">Gagal memuat data</h3>
        <p className="text-muted-foreground">{message}</p>
        <Button onClick={onRetry}>Coba Lagi</Button>
      </div>
    </div>
  );
}

