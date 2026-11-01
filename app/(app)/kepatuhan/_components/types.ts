export type Status = "BELUM" | "DRAF" | "TERKIRIM" | "TERLAMBAT";

export interface Row {
  key: string;
  title: string;
  recipient: string;
  group: string;
  doneLabel: string;
  basis: string;
  verification: "V" | "R" | "K";
  note: string | null;
  source: string;
  provisional: boolean;
  binding: boolean;
  custom: boolean;
  hint: string;
  bundle: string | null;
  due: string | null;
  dueNote: string | null;
  status: Status;
  late: boolean;
  daysLeft: number | null;
  soon: boolean;
  sentOn: string | null;
  evidenceSource: "SISTEM" | "CATATAN" | null;
  record: { status: string; sentOn: string | null; referenceNo: string | null; note: string | null; archiveId: string | null } | null;
  autoDerived: boolean;
  archive: { id: string; title: string } | null;
  disabled: boolean;
  override: { source: "KABUPATEN" | "GLOBAL"; basis: string | null; fromYear: number } | null;
}

export interface Tally {
  total: number;
  terkirim: number;
  terlambat: number;
  segera: number;
  draf: number;
  belum: number;
  terkirimTerlambat: number;
}

export interface Resp {
  year: number;
  today: string;
  village: { name: string };
  rows: Row[];
  tally: Tally;
  groups: { key: string; label: string }[];
  upcoming: { year: number; key: string; title: string; due: string; daysLeft: number; status: string }[];
  provisionalCount: number;
  can: Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
}
