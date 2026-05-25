export type IntegrationDirection = "export" | "import" | "push";

export type IntegrationAdapterId =
  | "residents_kemendesa"
  | "apbdes_siskeudes"
  | "sdgs_portal"
  | "prodeskel";

export type IntegrationExportFormat = "csv" | "json";

export type IntegrationAdapterMeta = {
  id: IntegrationAdapterId;
  label: string;
  description: string;
  direction: IntegrationDirection;
  formats: IntegrationExportFormat[];
  kemendesaSchema?: string;
};

export type IntegrationExportRow = Record<string, string | number | null>;

export type IntegrationExportResult = {
  adapterId: IntegrationAdapterId;
  format: IntegrationExportFormat;
  recordCount: number;
  filename: string;
  mimeType: string;
  /** CSV string or JSON-serializable payload */
  body: string | unknown;
  meta: Record<string, unknown>;
};

export type IntegrationSyncResult = {
  logId: number;
  status: "success" | "failed";
  recordCount: number;
  errorMessage?: string;
  meta?: Record<string, unknown>;
};
