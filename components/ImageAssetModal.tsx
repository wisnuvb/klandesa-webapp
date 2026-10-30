"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { formatBytes, validateImageFile, MAX_MEDIA_IMAGE_BYTES } from '@/lib/digitalArchive/media';
import { listImageAssets, uploadImageAsset, type ImageAssetItem } from '@/lib/digitalArchive/upload-image-client';

interface ImageAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
}

const PAGE_SIZE = 24;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Pemilih gambar dari aset digital desa. Daftar dan unggahan lewat arsip digital
 * (terisolasi per desa di server); hanya gambar berstatus publik yang bisa disisipkan
 * karena URL-nya dipakai di konten publik.
 */
export function ImageAssetModal({ isOpen, onClose, onSelectImage }: ImageAssetModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ImageAssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce pencarian agar tidak memanggil API di setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listImageAssets({ search, take: PAGE_SIZE, signal });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat aset gambar.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [isOpen, load]);

  const handleClose = () => {
    setSelectedId(null);
    setSearchInput('');
    setSearch('');
    setUploadError(null);
    setLoadError(null);
    setItems([]);
    setTotal(0);
    onClose();
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadError(null);
    try {
      const res = await listImageAssets({ search, take: PAGE_SIZE, skip: items.length });
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
      });
      setTotal(res.total);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat aset gambar.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const created = await uploadImageAsset(file);
      setItems((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
      setTotal((t) => t + 1);
      setSelectedId(created.id);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInsert = () => {
    const asset = items.find((a) => a.id === selectedId);
    if (!asset) return;
    onSelectImage(asset.url);
    handleClose();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const isSearching = search.length > 0;
  const showEmpty = !loading && !loadError && items.length === 0;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[100] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-1.5rem)] max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-white flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-teal-50 to-teal-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center" aria-hidden="true">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogPrimitive.Title className="font-semibold text-gray-900">Pilih Gambar</DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-gray-600">
                  Pilih dari aset digital atau upload baru
                </DialogPrimitive.Description>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup"
              className="p-2.5 hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
            </button>
          </div>

          {/* Search & Upload Bar */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari gambar..."
                  aria-label="Cari gambar"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-wait transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Upload className="w-4 h-4" aria-hidden="true" />
                )}
                {uploading ? 'Mengunggah...' : 'Upload Gambar'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={(e) => void handleFile(e.target.files?.[0])}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              JPG, PNG, WebP, atau GIF, maks {formatBytes(MAX_MEDIA_IMAGE_BYTES)}. Gambar yang diunggah bersifat publik
              dan tersimpan di arsip digital desa Anda.
            </p>
            {uploadError && (
              <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                {uploadError}
              </p>
            )}
          </div>

          {/* Image Grid */}
          <div
            className={`flex-1 overflow-y-auto p-6 transition-colors ${dragOver ? 'bg-teal-50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="Memuat gambar">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-4/3 rounded-xl bg-gray-100 animate-pulse motion-reduce:animate-none" />
                ))}
              </div>
            ) : loadError ? (
              <div role="alert" className="flex flex-col items-center justify-center h-64 text-center text-gray-600">
                <AlertCircle className="w-12 h-12 mb-3 text-red-500" aria-hidden="true" />
                <p className="font-medium">{loadError}</p>
                <button
                  type="button"
                  onClick={() => (items.length ? void loadMore() : void load())}
                  className="mt-4 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  Coba lagi
                </button>
              </div>
            ) : showEmpty ? (
              isSearching ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                  <ImageIcon className="w-16 h-16 mb-4" aria-hidden="true" />
                  <p className="text-lg font-medium text-gray-600">Tidak ada gambar ditemukan</p>
                  <p className="text-sm">Coba kata kunci lain atau upload gambar baru</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                  <ImageIcon className="w-16 h-16 mb-4" aria-hidden="true" />
                  <p className="text-lg font-medium text-gray-600">Belum ada aset gambar</p>
                  <p className="text-sm max-w-md">
                    Silakan menambahkan aset di sini atau upload langsung di dalam dialog ini.
                    Anda juga bisa menyeret gambar ke area ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Upload Gambar
                  </button>
                </div>
              )
            ) : (
              <>
                <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((asset) => {
                    const selected = selectedId === asset.id;
                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedId(asset.id)}
                          onDoubleClick={() => { onSelectImage(asset.url); handleClose(); }}
                          className={`group block w-full text-left rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                            selected
                              ? 'border-teal-600 shadow-lg ring-4 ring-teal-100'
                              : 'border-gray-200 hover:border-teal-400 hover:shadow-md'
                          }`}
                        >
                          <div className="relative aspect-4/3 bg-gray-100">
                            <Image
                              src={asset.url}
                              alt={asset.name}
                              fill
                              sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw"
                              className="object-cover"
                            />
                            {selected && (
                              <div className="absolute inset-0 bg-teal-600/20 flex items-center justify-center">
                                <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center shadow-lg">
                                  <Check className="w-7 h-7 text-white" aria-hidden="true" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-2 bg-white">
                            <p className="text-sm font-medium text-gray-900 truncate" title={asset.name}>{asset.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatBytes(asset.size)} · {formatDate(asset.uploadedAt)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {items.length < total && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      {loadingMore && <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                      Muat lebih banyak ({total - items.length} lagi)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600" role="status" aria-live="polite">
              {selectedId ? (
                <span className="text-teal-700 font-medium">1 gambar dipilih</span>
              ) : (
                'Pilih gambar untuk melanjutkan'
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!selectedId}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Masukkan Gambar
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
