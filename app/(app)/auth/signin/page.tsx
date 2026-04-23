import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

function SignInFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="h-7 w-48 bg-muted animate-pulse rounded mb-2" />
        <div className="h-4 w-full bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}
