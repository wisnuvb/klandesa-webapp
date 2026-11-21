import { AspirasiConsole } from "@/components/admin/aspirasi/AspirasiConsole";
import { isAspirasiIndexingEnabled } from "@/lib/aspirasi/seo";

// Status gerbang indeks dibaca dari env saat permintaan, bukan dibekukan saat build.
export const dynamic = "force-dynamic";

export default function AdminAspirasiPage() {
  return <AspirasiConsole indexingEnabled={isAspirasiIndexingEnabled()} />;
}
