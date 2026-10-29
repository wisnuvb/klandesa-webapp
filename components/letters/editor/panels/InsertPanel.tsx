"use client";

import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { BLOCK_PRESETS, type EditorApi, type PresetId } from "@/lib/letters/editor";
import { groupPresets, insertTargetFor } from "./helpers";
import { PresetIcon } from "./icons";
import { EmptyNote, controlClass, hintClass, labelClass } from "./ui";

type CardProps = { id: PresetId; label: string; description: string; icon: string; onPick: (id: PresetId) => void };

const PresetCard = memo(function PresetCard({ id, label, description, icon, onPick }: CardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(id)}
        className="flex min-h-11 w-full items-start gap-3 rounded-lg border border-input bg-background p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PresetIcon name={icon} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <span>
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    </li>
  );
});

export const InsertPanel = memo(function InsertPanel({ editor }: { editor: EditorApi }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const groups = useMemo(() => groupPresets(BLOCK_PRESETS, deferred), [deferred]);
  const searchId = useId();
  const [announce, setAnnounce] = useState("");

  // Agar kartu tidak dirender ulang tiap dokumen berubah, kartu memakai fungsi tetap yang membaca editor terbaru.
  const latest = useRef(editor);
  useEffect(() => {
    latest.current = editor;
  });
  const onPick = useCallback((id: PresetId) => {
    const ed = latest.current;
    ed.addBlock(id, insertTargetFor(ed.doc, ed.selectedId));
    const name = BLOCK_PRESETS.find((p) => p.id === id)?.label ?? "Bagian";
    setAnnounce(`${name} ditambahkan.`);
  }, []);

  const hasSelection = !!editor.selectedId;
  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={searchId} className={labelClass}>Cari bagian</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="mis. tanda tangan, tabel"
            autoComplete="off"
            className={`${controlClass} pl-9`}
          />
        </div>
        <p className={hintClass}>
          {hasSelection ? "Bagian baru ditambahkan tepat di bawah bagian yang sedang dipilih." : "Bagian baru ditambahkan di akhir surat."}
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announce || `${count} bagian ditemukan`}</p>

      {groups.length === 0 ? (
        <EmptyNote>Tidak ada bagian yang cocok dengan &ldquo;{query}&rdquo;.</EmptyNote>
      ) : (
        groups.map((g) => (
          <section key={g.category} aria-label={g.label} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
            <ul className="space-y-2">
              {g.items.map((p) => (
                <PresetCard key={p.id} id={p.id} label={p.label} description={p.description} icon={p.icon} onPick={onPick} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
});
