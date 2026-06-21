import { AsyncState } from "@/components/app/patterns";
import type { AsyncPageError } from "@/lib/modules/client-error";

type ErrorStateProps = {
  message: AsyncPageError;
  onRetry: () => void;
};

export function ErrorState(props: ErrorStateProps) {
  const { message, onRetry } = props;

  return (
    <AsyncState error={message} onRetry={onRetry}>
      {null}
    </AsyncState>
  );
}
