import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BillingStatusResponse } from "../_lib/types";
import { format } from "date-fns";

type SubscriptionSummaryCardProps = {
  loading: boolean;
  error: string | null;
  data: BillingStatusResponse | null;
};

export function SubscriptionSummaryCard(props: SubscriptionSummaryCardProps) {
  const { loading, error, data } = props;

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
              <div className="flex items-center gap-2">
                <div className="font-medium">
                  {data.subscription.plan ?? "-"}
                </div>
                <Badge
                  variant={data.subscription.active ? "default" : "secondary"}
                >
                  {data.subscription.active ? "Aktif" : "Tidak Aktif"}
                </Badge>
              </div>
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
