"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { AttendanceHistoryResponse, AttendanceStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

function formatDateId(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return "Pilih tanggal";
  const from = range.from;
  const to = range.to ?? range.from;
  return `${formatDateId(from)} s/d ${formatDateId(to)}`;
}

export function AttendanceHistory() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [range, setRange] = useState<DateRange>({
    from: addDays(today, -6),
    to: today,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">(
    "ALL",
  );

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [data, setData] = useState<AttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeFromTime = range?.from?.getTime();
  const rangeToTime = range?.to?.getTime();

  useEffect(() => {
    setPage(1);
  }, [rangeFromTime, rangeToTime, searchQuery, filterStatus]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const from = range?.from ? formatDateId(range.from) : null;
        const to = range?.to ? formatDateId(range.to) : from;
        if (!from || !to) {
          setData(null);
          return;
        }

        const qs = new URLSearchParams();
        qs.set("from", from);
        qs.set("to", to);
        qs.set("page", String(page));
        qs.set("pageSize", String(pageSize));
        if (searchQuery.trim()) qs.set("search", searchQuery.trim());
        if (filterStatus !== "ALL") qs.set("status", filterStatus);

        const res = await fetch(`/api/attendance/history?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Gagal memuat riwayat absensi");
        }

        const json = (await res.json()) as AttendanceHistoryResponse;
        setData(json);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(
          e instanceof Error ? e.message : "Gagal memuat riwayat absensi",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [range, page, pageSize, searchQuery, filterStatus]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const canPrev = page > 1;
  const canNext = data ? page < totalPages : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start gap-2 font-normal"
            >
              <CalendarIcon className="h-4 w-4" />
              {formatRangeLabel(range)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(next) => {
                if (!next) return;
                setRange(next);
              }}
              numberOfMonths={2}
              disabled={(date) => date > endOfDay(today)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama pegawai..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as AttendanceStatus | "ALL")
            }
            className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PRESENT">Hadir</option>
            <option value="LATE">Terlambat</option>
            <option value="LEAVE">Izin</option>
            <option value="ABSENT">Tidak Hadir</option>
          </select>
        </div>
      </div>

      {data?.range.clamped && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Paket Anda membatasi riwayat maksimal {data.range.maxDays} hari.
          Rentang tanggal otomatis disesuaikan.
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-gray-500">Memuat...</div>
      )}

      {!loading && error && (
        <div className="py-12 text-center text-red-600">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pegawai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Jabatan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Check In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Check Out
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {row.attendance_date}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-teal-700">
                            {row.user_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {row.user_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {row.position}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {row.check_in_time || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {row.check_out_time || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.rows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Tidak ada data di rentang tanggal ini
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: {data.total} data
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                  canPrev
                    ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <div className="text-sm text-gray-600">
                {page}/{totalPages}
              </div>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                  canNext
                    ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
