"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/components/ui/utils";
import { buttonVariants } from "@/components/ui/button";

export type AppDialogTone = "default" | "destructive";

export type AppAlertOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: AppDialogTone;
};

export type AppConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppDialogTone;
};

type Pending =
  | {
      kind: "alert";
      title: string;
      description?: React.ReactNode;
      confirmLabel: string;
      tone: AppDialogTone;
      resolve: () => void;
    }
  | {
      kind: "confirm";
      title: string;
      description?: React.ReactNode;
      confirmLabel: string;
      cancelLabel: string;
      tone: AppDialogTone;
      resolve: (value: boolean) => void;
    };

export type AppDialogContextValue = {
  appAlert: (options: AppAlertOptions | string) => Promise<void>;
  appConfirm: (options: AppConfirmOptions | string) => Promise<boolean>;
};

const AppDialogContext = React.createContext<AppDialogContextValue | null>(
  null,
);

export function useAppDialogs(): AppDialogContextValue {
  const ctx = React.useContext(AppDialogContext);
  if (!ctx) {
    throw new Error(
      "useAppDialogs harus dipakai dalam AppDialogProvider (layout aplikasi)",
    );
  }
  return ctx;
}

/** Fallback untuk test/story atau modul luar tree provider. */
export function useAppDialogsSafe(): AppDialogContextValue {
  const ctx = React.useContext(AppDialogContext);
  if (ctx) return ctx;
  return {
    appAlert: async (opts) => {
      const msg = typeof opts === "string" ? opts : opts.title;
      window.alert(msg);
    },
    appConfirm: async (opts) => {
      const msg =
        typeof opts === "string"
          ? opts
          : [opts.title, opts.description].filter(Boolean).join("\n\n");
      return window.confirm(msg);
    },
  };
}

function normalizeAlert(
  options: AppAlertOptions | string,
): Omit<Pending & { kind: "alert" }, "kind" | "resolve"> {
  if (typeof options === "string") {
    return {
      title: options,
      description: undefined,
      confirmLabel: "Oke",
      tone: "default",
    };
  }
  return {
    title: options.title,
    description: options.description,
    confirmLabel: options.confirmLabel ?? "Oke",
    tone: options.tone ?? "default",
  };
}

function normalizeConfirm(
  options: AppConfirmOptions | string,
): Omit<Pending & { kind: "confirm" }, "kind" | "resolve"> {
  if (typeof options === "string") {
    return {
      title: "Konfirmasi",
      description: options,
      confirmLabel: "Ya",
      cancelLabel: "Batal",
      tone: "default",
    };
  }
  return {
    title: options.title,
    description: options.description,
    confirmLabel: options.confirmLabel ?? "Ya",
    cancelLabel: options.cancelLabel ?? "Batal",
    tone: options.tone ?? "default",
  };
}

export function AppDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const pendingRef = React.useRef<Pending | null>(null);
  const suppressDismissRef = React.useRef(false);

  React.useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const finalize = React.useCallback(() => setPending(null), []);

  const appAlert = React.useCallback((options: AppAlertOptions | string) => {
    const n = normalizeAlert(options);
    return new Promise<void>((resolve) => {
      setPending({
        kind: "alert",
        ...n,
        resolve,
      });
    });
  }, []);

  const appConfirm = React.useCallback(
    (options: AppConfirmOptions | string) => {
      const n = normalizeConfirm(options);
      return new Promise<boolean>((resolve) => {
        setPending({
          kind: "confirm",
          ...n,
          resolve,
        });
      });
    },
    [],
  );

  const value = React.useMemo(
    (): AppDialogContextValue => ({ appAlert, appConfirm }),
    [appAlert, appConfirm],
  );

  const open = pending !== null;

  /** Radix membuka / menutup: Escape dan interaksi pembatal mengirim nextOpen=false */
  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      if (suppressDismissRef.current) {
        suppressDismissRef.current = false;
        return;
      }
      const p = pendingRef.current;
      if (!p) return;
      if (p.kind === "confirm") p.resolve(false);
      else p.resolve();
      finalize();
    },
    [finalize],
  );

  const actionClassFor = (tone: AppDialogTone) =>
    tone === "destructive"
      ? cn(buttonVariants({ variant: "destructive" }))
      : undefined;

  const descriptionNode =
    pending &&
    pending.description !== undefined &&
    pending.description !== null &&
    pending.description !== "" ? (
      typeof pending.description === "string" ? (
        <AlertDialogDescription className="whitespace-pre-wrap">
          {pending.description}
        </AlertDialogDescription>
      ) : (
        <AlertDialogDescription asChild>
          <div className="space-y-2 text-muted-foreground text-sm [&_p+p]:mt-2">
            {pending.description}
          </div>
        </AlertDialogDescription>
      )
    ) : null;

  return (
    <AppDialogContext.Provider value={value}>
      {children}

      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          {pending ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{pending.title}</AlertDialogTitle>
                {descriptionNode}
              </AlertDialogHeader>
              <AlertDialogFooter>
                {pending.kind === "confirm" ? (
                  <>
                    <AlertDialogCancel
                      type="button"
                      onClick={() => {
                        suppressDismissRef.current = true;
                        pending.resolve(false);
                        finalize();
                      }}
                    >
                      {pending.cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      className={actionClassFor(pending.tone)}
                      onClick={() => {
                        suppressDismissRef.current = true;
                        pending.resolve(true);
                        finalize();
                      }}
                    >
                      {pending.confirmLabel}
                    </AlertDialogAction>
                  </>
                ) : (
                  <AlertDialogAction
                    type="button"
                    className={actionClassFor(pending.tone)}
                    onClick={() => {
                      suppressDismissRef.current = true;
                      pending.resolve();
                      finalize();
                    }}
                  >
                    {pending.confirmLabel}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </AppDialogContext.Provider>
  );
}
