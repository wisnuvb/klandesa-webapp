"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleTierBadge } from "@/components/modules/ModuleTierBadge";

type OnboardingSteps = {
  profile?: boolean;
  official?: boolean;
  resident?: boolean;
  letter?: boolean;
};

const STEPS = [
  {
    key: "profile" as const,
    title: "Profil Desa",
    description: "Logo desa dan kode wilayah resmi",
    path: "/pengaturan-desa",
    icon: Settings2,
    tier: "starter" as const,
  },
  {
    key: "official" as const,
    title: "Perangkat Desa",
    description: "Tambahkan minimal satu perangkat",
    path: "/data-perangkat",
    icon: Users,
    tier: "starter" as const,
  },
  {
    key: "resident" as const,
    title: "Data Warga",
    description: "Contoh satu data warga",
    path: "/data-warga",
    icon: Users,
    tier: "starter" as const,
  },
  {
    key: "letter" as const,
    title: "Surat Pertama",
    description: "Template atau antrian layanan surat",
    path: "/layanan-surat",
    icon: FileText,
    tier: "starter" as const,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<OnboardingSteps>({});
  const [completed, setCompleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/village/onboarding", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        steps?: OnboardingSteps;
        completed?: boolean;
      };
      setSteps(data.steps ?? {});
      setCompleted(Boolean(data.completed));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const doneCount = STEPS.filter((s) => steps[s.key]).length;
  const progress = (doneCount / STEPS.length) * 100;

  const finish = async () => {
    await fetch("/api/village/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markComplete: true }),
    });
    router.replace("/dashboard");
  };

  const skip = async () => {
    await fetch("/api/village/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markComplete: true }),
    });
    router.replace("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Selamat datang di Klandesa</h1>
        <p className="text-muted-foreground mt-1">
          Trial Profesional 14 hari aktif. Lengkapi langkah berikut untuk memulai
          operasional desa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Onboarding</CardTitle>
          <CardDescription>
            {doneCount} dari {STEPS.length} langkah selesai
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <ul className="space-y-3">
            {STEPS.map((step) => {
              const done = Boolean(steps[step.key]);
              const Icon = step.icon;
              return (
                <li
                  key={step.key}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{step.title}</span>
                      <ModuleTierBadge tier={step.tier} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={step.path}>
                      Buka
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => void skip()}>
              Lewati dulu
            </Button>
            <Button onClick={() => void finish()} disabled={doneCount < 1}>
              Selesai & ke Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
