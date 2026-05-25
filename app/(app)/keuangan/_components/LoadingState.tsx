import { AsyncState } from "@/components/app/patterns";

export function LoadingState() {
  return (
    <AsyncState loading loadingMessage="Memuat data keuangan...">
      {null}
    </AsyncState>
  );
}
