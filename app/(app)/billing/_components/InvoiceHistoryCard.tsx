import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIdr } from "@/lib/billing/catalog";
import type { BillingStatusResponse } from "../_lib/types";
import { statusBadgeVariant } from "../_lib/statusBadgeVariant";

type InvoiceHistoryCardProps = {
  invoices: BillingStatusResponse["invoices"] | null | undefined;
};

export function InvoiceHistoryCard(props: InvoiceHistoryCardProps) {
  const { invoices } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Produk</th>
                  <th className="py-2 pr-3">Paket</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="py-2 pr-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2 pr-3">{inv.productType}</td>
                    <td className="py-2 pr-3">{inv.planCode}</td>
                    <td className="py-2 pr-3">{formatIdr(inv.amount)}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">{inv.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Belum ada invoice</div>
        )}
      </CardContent>
    </Card>
  );
}

