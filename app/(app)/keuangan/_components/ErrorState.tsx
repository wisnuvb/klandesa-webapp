import { AsyncState } from "@/components/app/patterns";

type ErrorStateProps = {
  message: string;
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
