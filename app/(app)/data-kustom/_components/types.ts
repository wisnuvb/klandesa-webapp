import type { FieldDef } from "@/lib/custom-data/schema";

export interface TableDetailView {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  linkResident: boolean;
  recordCount: number;
  fields: FieldDef[];
}

export interface RecordRowView {
  id: string;
  data: Record<string, unknown>;
  resident: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
