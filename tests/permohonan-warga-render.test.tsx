import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { RequestTable } from "../components/app/permohonan-warga/RequestTable.tsx";
import type { QueueRow } from "../lib/mail/request-queue.ts";

const row: QueueRow = {
  id: 7, requestNumber: "PMH-0007", name: "Budi", nik: "3508000000000001", mailType: "Surat Keterangan Domisili", purpose: "Melamar kerja",
  status: "PENDING", channel: "mobile", rtStatus: null, rtNote: null, rtLabel: null, requestDate: "2026-10-30T03:00:00.000Z", processedDate: null,
  ageDays: 3, notes: null, rejectionReason: null, mailServiceId: null, residentId: 1,
  checks: { ready: true, blocking: [], warnings: [], blocksApproval: false, attention: false },
};

// Antrean memakai bentuk baris dari API (QueueRow), bukan bentuk lama (pemohon_name, lampiran): regresi "Cannot read properties of undefined (reading 'length')".
test("tabel permohonan merender baris berbentuk QueueRow tanpa galat", () => {
  const html = renderToString(
    <RequestTable rows={[row]} loading={false} error={null} filtered={false} page={1} pageSize={10} total={1} onPage={() => {}} onOpen={() => {}} onRetry={() => {}} />,
  );
  assert.match(html, /Budi/);
  assert.match(html, /Surat Keterangan Domisili/);
  assert.match(html, /PMH-0007/);
});
