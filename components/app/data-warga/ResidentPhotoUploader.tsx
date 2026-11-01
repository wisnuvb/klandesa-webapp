"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cropRect } from "@/lib/digitalArchive/image-edit";
import {
  PHOTO_SIZE,
  PICKABLE_TYPES,
  THUMB_SIZE,
  removeResidentPhoto,
  renderSquareJpeg,
  uploadResidentPhoto,
  validatePickedFile,
} from "@/lib/residents/photo-client";

const FRAME = 256; // sisi bingkai pratinjau (px layar)
const MAX_ZOOM = 3;

type Props = {
  residentId: number;
  name: string;
  photo: string | null;
  photoThumb: string | null;
  /** Dipanggil setelah foto berhasil disimpan/dihapus (mis. untuk menyegarkan tabel). */
  onChanged?: () => void;
};

/** Foto profil warga: pilih berkas → atur potongan persegi → simpan. Langsung tersimpan, tidak menunggu tombol "Simpan Perubahan" formulir. */
export function ResidentPhotoUploader({ residentId, name, photo, photoThumb, onChanged }: Props) {
  const [current, setCurrent] = useState({ photo, photoThumb });
  useEffect(() => setCurrent({ photo, photoThumb }), [photo, photoThumb, residentId]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const has = !!(current.photoThumb || current.photo);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // pilih berkas yang sama dua kali tetap memicu change
    if (!f) return;
    const invalid = validatePickedFile(f);
    setPickError(invalid);
    if (!invalid) setFile(f);
  }

  async function onRemove() {
    setRemoving(true);
    try {
      setCurrent(await removeResidentPhoto(residentId));
      toast.success("Foto dihapus");
      setRemoveOpen(false);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus foto");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Avatar className="size-24 border">
        <AvatarImage src={current.photo || current.photoThumb || undefined} alt={has ? `Foto ${name}` : ""} />
        <AvatarFallback className="text-2xl">{name.trim().slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Camera aria-hidden="true" />
            {has ? "Ganti foto" : "Unggah foto"}
          </Button>
          {has ? (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoveOpen(true)}>
              <Trash2 aria-hidden="true" />
              Hapus foto
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, atau WebP. Foto dipotong persegi dan dikecilkan otomatis.
        </p>
        {pickError ? (
          <p role="alert" className="text-sm text-destructive">
            {pickError}
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={PICKABLE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPick}
        />
      </div>

      {file ? (
        <CropDialog
          file={file}
          residentId={residentId}
          onClose={() => setFile(null)}
          onSaved={(p) => {
            setCurrent(p);
            setFile(null);
            toast.success("Foto disimpan");
            onChanged?.();
          }}
        />
      ) : null}

      <AlertDialog open={removeOpen} onOpenChange={(o) => !removing && setRemoveOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus foto {name}?</AlertDialogTitle>
            <AlertDialogDescription>Foto akan dihapus dari data warga dan dari aplikasi warga. Data lainnya tidak berubah.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={(e) => {
                e.preventDefault(); // tetap terbuka sampai selesai agar kegagalan terlihat
                void onRemove();
              }}
            >
              {removing ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CropDialog({
  file,
  residentId,
  onClose,
  onSaved,
}: {
  file: File;
  residentId: number;
  onClose: () => void;
  onSaved: (p: { photo: string | null; photoThumb: string | null }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<{ cx: number; cy: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setCenter({ cx: el.naturalWidth / 2, cy: el.naturalHeight / 2 });
    };
    el.onerror = () => setLoadFailed(true);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const rect = useMemo(
    () => (img && center ? cropRect({ imgW: img.naturalWidth, imgH: img.naturalHeight, aspect: 1, zoom, cx: center.cx, cy: center.cy }) : null),
    [img, center, zoom],
  );

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !img || !rect) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, c.width, c.height);
  }, [img, rect]);

  const pan = useCallback(
    (dxScreen: number, dyScreen: number) => {
      if (!rect) return;
      const k = rect.w / FRAME; // px gambar per px layar
      setCenter({ cx: rect.x + rect.w / 2 - dxScreen * k, cy: rect.y + rect.h / 2 - dyScreen * k });
    },
    [rect],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    const step = 16;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    pan(m[0], m[1]);
  }

  async function onSave() {
    if (!img || !rect) return;
    setSaving(true);
    setError(null);
    try {
      const [full, thumb] = await Promise.all([renderSquareJpeg(img, rect, PHOTO_SIZE, 0.85), renderSquareJpeg(img, rect, THUMB_SIZE, 0.8)]);
      onSaved(await uploadResidentPhoto(residentId, full, thumb));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan foto.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atur foto</DialogTitle>
          <DialogDescription>Geser foto atau pakai tombol panah untuk mengatur posisi wajah, lalu perbesar bila perlu.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {loadFailed ? (
            <p role="alert" className="text-sm text-destructive">
              Foto tidak bisa dibuka. Coba berkas lain.
            </p>
          ) : (
            <div className="relative rounded-md bg-muted" style={{ width: FRAME, height: FRAME }}>
              <canvas
                ref={canvasRef}
                width={FRAME * 2}
                height={FRAME * 2}
                tabIndex={0}
                role="img"
                aria-label="Area potong foto. Gunakan tombol panah untuk menggeser."
                onKeyDown={onKeyDown}
                onPointerDown={(e) => {
                  drag.current = { x: e.clientX, y: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  pan(e.clientX - drag.current.x, e.clientY - drag.current.y);
                  drag.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                className="size-full cursor-grab touch-none rounded-md active:cursor-grabbing"
              />
              {/* Lingkaran panduan: di aplikasi, foto tampil bulat. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-md" style={{ background: "radial-gradient(circle at center, transparent 49.5%, rgba(0,0,0,0.45) 50%)" }} />
              {!img ? <Loader2 className="absolute inset-0 m-auto animate-spin text-muted-foreground" aria-label="Memuat foto" /> : null}
            </div>
          )}

          <div className="w-full space-y-1">
            <label htmlFor="foto-warga-zoom" className="text-sm font-medium">
              Perbesar
            </label>
            <input
              id="foto-warga-zoom"
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              disabled={!img || saving}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {error ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={!img || saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {saving ? "Menyimpan..." : error ? "Coba lagi" : "Simpan foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
