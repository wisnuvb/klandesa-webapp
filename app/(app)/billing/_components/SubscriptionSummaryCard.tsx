import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BillingStatusResponse } from "../_lib/types";
import { format } from "date-fns";
import {
  SUBSCRIPTION_EXPIRING_SOON_DAYS,
  SUBSCRIPTION_EXPIRING_URGENT_DAYS,
} from "@/lib/subscription";

const PHASE_LABELS: Record<string, string> = {
  trial: "Trial Profesional",
  grace: "Grace (Baca Saja)",
  active: "Aktif",
  inactive: "Tidak Aktif",
};

type SubscriptionSummaryCardProps = {
  loading: boolean;
  error: string | null;
  data: BillingStatusResponse | null;
};

export function SubscriptionSummaryCard(props: SubscriptionSummaryCardProps) {
  const { loading, error, data } = props;
  const phase = data?.subscription.phase ?? "inactive";
  const phaseLabel = PHASE_LABELS[phase] ?? phase;
  const daysRemaining = data?.subscription.daysRemaining ?? null;
  const showDaysRemaining =
    daysRemaining != null &&
    (phase === "trial" ||
      (phase === "active" &&
        data?.subscription.expiringSoon &&
        daysRemaining <= SUBSCRIPTION_EXPIRING_SOON_DAYS));
  const daysUrgent =
    daysRemaining != null && daysRemaining <= SUBSCRIPTION_EXPIRING_URGENT_DAYS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Langganan</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="text-sm text-muted-foreground">Memuat...</div>
        )}
        {!loading && error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Desa</div>
              <div className="font-medium">{data.village.name}</div>
              <div className="text-sm text-muted-foreground">
                {data.village.code}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Paket Desa</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium capitalize">
                  {data.subscription.plan ?? "-"}
                </div>
                <Badge
                  variant={
                    data.subscription.active
                      ? phase === "trial"
                        ? "secondary"
                        : "default"
                      : "destructive"
                  }
                >
                  {phaseLabel}
                </Badge>
              </div>
              {showDaysRemaining && (
                <div
                  className={
                    daysUrgent
                      ? "text-sm text-amber-700 font-medium mt-1"
                      : "text-sm text-muted-foreground mt-1"
                  }
                >
                  {daysRemaining === 0
                    ? "Berakhir hari ini"
                    : `${daysRemaining} hari tersisa`}
                  {phase === "active" ? " — perpanjang paket" : ""}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Masa Aktif:{" "}
                {data.subscription.expiry
                  ? format(new Date(data.subscription.expiry), "dd MMMM yyyy")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Bundle</div>
              <div className="text-sm">
                Absensi: {data.entitlements?.absensiTier ?? "-"}
              </div>
              <div className="text-sm">
                Arsip: {data.entitlements?.arsipTier ?? "-"} (
                {data.entitlements?.arsipStorageLimitGb ?? 0} GB)
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
