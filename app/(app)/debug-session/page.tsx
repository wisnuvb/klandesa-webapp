"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function DebugSessionPage() {
  const { data: session, status } = useSession();
  const [apiSession, setApiSession] = useState<unknown>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cookies, setCookies] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setApiSession)
      .catch((e) => setApiError(e.message));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCookies(document.cookie);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Debug Session</h1>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">useSession() Status</h2>
          <div className="text-sm space-y-1">
            <div>Status: <code className="bg-muted px-2 py-1 rounded">{status}</code></div>
            <div>Session: <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(session, null, 2)}</pre></div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">/api/auth/session Response</h2>
          {apiError && <div className="text-red-600 text-sm">Error: {apiError}</div>}
          {!apiError && (
            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
              {JSON.stringify(apiSession, null, 2)}
            </pre>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Browser Cookies</h2>
          <div className="text-xs bg-muted p-2 rounded break-all">
            {cookies || "No cookies"}
          </div>
        </div>
      </div>
    </div>
  );
}
