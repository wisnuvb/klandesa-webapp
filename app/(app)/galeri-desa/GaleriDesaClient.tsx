"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Calendar,
  ChevronDown,
  Download,
  Eye,
  Grid3x3,
  Image as ImageIcon,
  LayoutList,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { GalleryCategory, GalleryImage } from "./_types";
import { formatFileSize } from "../arsip/_utils/fileUtils";

type Props = {
  initialImages: GalleryImage[];
};

const CATEGORY_OPTIONS: Array<{ value: GalleryCategory; label: string }> = [
  { value: "KEGIATAN", label: "Kegiatan" },
  { value: "PEMBANGUNAN", label: "Pembangunan" },
  { value: "ACARA", label: "Acara" },
  { value: "FASILITAS", label: "Fasilitas" },
  { value: "LAINNYA", label: "Lainnya" },
];

async function readJsonError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error || "Request gagal";
  } catch {
    return "Request gagal";
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getCategoryBadge(category: GalleryCategory) {
  const badges: Record<
    GalleryCategory,
    { bg: string; text: string; label: string }
  > = {
    KEGIATAN: { bg: "bg-blue-100", text: "text-blue-700", label: "Kegiatan" },
    PEMBANGUNAN: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      label: "Pembangunan",
    },
    ACARA: { bg: "bg-purple-100", text: "text-purple-700", label: "Acara" },
    FASILITAS: {
      bg: "bg-green-100",
      text: "text-green-700",
      label: "Fasilitas",
    },
    LAINNYA: { bg: "bg-gray-100", text: "text-gray-700", label: "Lainnya" },
  };
  const badge = badges[category];
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
    >
      {badge.label}
    </span>
  );
}

export default function GaleriDesaClient(props: Props) {
  const { initialImages } = props;

  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<GalleryCategory | "ALL">(
    "ALL",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showArchivePickerModal, setShowArchivePickerModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [availableArchives, setAvailableArchives] = useState<
    Array<{
      id: number;
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      category: string;
      subCategory: string | null;
      title: string;
      description: string | null;
      uploadedByName: string;
      uploadedAt: string;
    }>
  >([]);
  const [selectedArchive, setSelectedArchive] = useState<{
    id: number;
    filePath: string;
    fileSize: number;
    title: string;
    description: string | null;
    uploadedByName: string;
    uploadedAt: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "KEGIATAN" as GalleryCategory,
  });

  const stats = useMemo(() => {
    const totalSizeBytes = images.reduce(
      (sum, img) => sum + img.fileSizeBytes,
      0,
    );
    return {
      totalImages: images.length,
      totalViews: images.reduce((sum, img) => sum + img.viewsCount, 0),
      totalSizeText: formatFileSize(totalSizeBytes),
      categories: new Set(images.map((img) => img.category)).size,
    };
  }, [images]);

  const filteredImages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return images
      .filter((image) => {
        const matchSearch =
          !q ||
          image.title.toLowerCase().includes(q) ||
          image.description.toLowerCase().includes(q);
        const matchCategory =
          filterCategory === "ALL" || image.category === filterCategory;
        return matchSearch && matchCategory;
      })
      .sort(
        (a, b) =>
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
      );
  }, [filterCategory, images, searchQuery]);

  const handleViewDetail = async (image: GalleryImage) => {
    setSelectedImage(image);
    setShowDetailModal(true);
    setImages((prev) =>
      prev.map((img) =>
        img.id === image.id ? { ...img, viewsCount: img.viewsCount + 1 } : img,
      ),
    );

    try {
      const res = await fetch(`/api/digital-archives/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { viewsCount?: number };
      if (typeof data.viewsCount === "number") {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, viewsCount: data.viewsCount! }
              : img,
          ),
        );
      }
    } catch {
      return;
    }
  };

  const openArchivePicker = async () => {
    setShowArchivePickerModal(true);
    setSelectedArchive(null);
    setFormData({ title: "", description: "", category: "KEGIATAN" });
    setArchiveSearch("");
    setIsLoadingArchives(true);
    try {
      const res = await fetch(
        `/api/digital-archives?type=image&excludeCategory=GALERI_DESA&take=48&skip=0`,
      );
      if (!res.ok) throw new Error(await readJsonError(res));
      const data = (await res.json()) as {
        rows: Array<{
          id: number;
          fileName: string;
          filePath: string;
          fileType: string;
          fileSize: number;
          category: string;
          subCategory: string | null;
          title: string;
          description: string | null;
          uploadedByName: string;
          uploadedAt: string;
        }>;
      };
      setAvailableArchives(data.rows || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat arsip",
      );
    } finally {
      setIsLoadingArchives(false);
    }
  };

  const searchArchives = async () => {
    setIsLoadingArchives(true);
    try {
      const params = new URLSearchParams({
        type: "image",
        excludeCategory: "GALERI_DESA",
        take: "48",
        skip: "0",
      });
      if (archiveSearch.trim()) params.set("search", archiveSearch.trim());
      const res = await fetch(`/api/digital-archives?${params.toString()}`);
      if (!res.ok) throw new Error(await readJsonError(res));
      const data = (await res.json()) as { rows: typeof availableArchives };
      setAvailableArchives(data.rows || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat arsip",
      );
    } finally {
      setIsLoadingArchives(false);
    }
  };

  const handleAssignFromArchive = async () => {
    if (!selectedArchive) return;
    const title = formData.title.trim();
    const description = formData.description.trim();
    if (!title) return;

    setIsAssigning(true);
    try {
      const res = await fetch(`/api/digital-archives/${selectedArchive.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gallery_assign",
          title,
          description: description || null,
          galleryCategory: formData.category,
        }),
      });

      if (!res.ok) throw new Error(await readJsonError(res));
      const updated = (await res.json()) as {
        id: number;
        filePath: string;
        title: string;
        description: string | null;
        subCategory: string | null;
        uploadedByName: string;
        uploadedAt: string;
        viewsCount: number;
        fileSize: number;
      };

      const newItem: GalleryImage = {
        id: updated.id,
        title: updated.title,
        description: updated.description || "",
        category: formData.category,
        imageUrl: updated.filePath,
        uploadedBy: updated.uploadedByName,
        uploadDate: updated.uploadedAt,
        viewsCount: updated.viewsCount || 0,
        fileSizeBytes: updated.fileSize,
      };

      setImages((prev) => [newItem, ...prev]);
      setShowArchivePickerModal(false);
      toast.success("Foto ditambahkan ke galeri");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menambahkan ke galeri",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Foto</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalImages}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tayangan</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">
                {stats.totalViews}
              </p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Ukuran</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {stats.totalSizeText}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kategori</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {stats.categories}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Grid3x3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari foto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value as GalleryCategory | "ALL")
                }
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
              >
                <option value="ALL">Semua Kategori</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${
                  viewMode === "grid"
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${
                  viewMode === "list"
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <LayoutList className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={openArchivePicker}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Pilih dari Arsip
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => handleViewDetail(image)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={image.imageUrl}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    width={400}
                    height={225}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Eye className="w-4 h-4" />
                      <span>{image.viewsCount}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {image.title}
                    </h3>
                    {getCategoryBadge(image.category)}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {image.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(image.uploadDate)}
                    </span>
                    <span>{formatFileSize(image.fileSizeBytes)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetail(image)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-full h-full object-cover"
                      width={175}
                      height={175}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {image.title}
                      </h3>
                      {getCategoryBadge(image.category)}
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {image.description}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(image.uploadDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {image.viewsCount} tayangan
                      </span>
                      <span>{formatFileSize(image.fileSizeBytes)}</span>
                      <span>oleh {image.uploadedBy}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {filteredImages.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Tidak ada foto</p>
        </div>
      )}

      <AnimatePresence>
        {showArchivePickerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowArchivePickerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Pilih Foto dari Arsip
                </h3>
                <button
                  onClick={() => setShowArchivePickerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/2">
                    <div className="flex gap-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          value={archiveSearch}
                          onChange={(e) => setArchiveSearch(e.target.value)}
                          placeholder="Cari di arsip..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={searchArchives}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                        disabled={isLoadingArchives}
                      >
                        Cari
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-[360px] overflow-y-auto">
                        {isLoadingArchives ? (
                          <div className="p-6 text-sm text-gray-500">
                            Memuat arsip...
                          </div>
                        ) : availableArchives.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500">
                            Tidak ada gambar di arsip. Upload dulu lewat halaman
                            Arsip.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 p-3">
                            {availableArchives.map((a) => (
                              <button
                                type="button"
                                key={a.id}
                                onClick={() => {
                                  setSelectedArchive({
                                    id: a.id,
                                    filePath: a.filePath,
                                    fileSize: a.fileSize,
                                    title: a.title,
                                    description: a.description,
                                    uploadedByName: a.uploadedByName,
                                    uploadedAt: a.uploadedAt,
                                  });
                                  setFormData({
                                    title: a.title || "",
                                    description: a.description || "",
                                    category: "KEGIATAN",
                                  });
                                }}
                                className={`text-left border rounded-lg overflow-hidden hover:shadow-sm transition-shadow ${
                                  selectedArchive?.id === a.id
                                    ? "border-teal-500 ring-2 ring-teal-100"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="relative aspect-video bg-gray-100">
                                  <Image
                                    src={a.filePath}
                                    alt={a.title}
                                    className="w-full h-full object-cover"
                                    width={360}
                                    height={200}
                                  />
                                </div>
                                <div className="p-2">
                                  <div className="text-sm font-medium text-gray-900 line-clamp-1">
                                    {a.title || a.fileName}
                                  </div>
                                  <div className="text-xs text-gray-500 line-clamp-1">
                                    {a.category}
                                    {a.subCategory ? ` / ${a.subCategory}` : ""}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:w-1/2 space-y-4">
                    {selectedArchive ? (
                      <>
                        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={selectedArchive.filePath}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            width={720}
                            height={400}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Judul Foto *
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                title: e.target.value,
                              })
                            }
                            placeholder="Masukkan judul foto"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kategori *
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                category: e.target.value as GalleryCategory,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Deskripsi
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                            placeholder="Masukkan deskripsi foto..."
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <a
                            href="/arsip"
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
                          >
                            Buka Arsip
                          </a>
                          <button
                            type="button"
                            onClick={handleAssignFromArchive}
                            disabled={isAssigning || !formData.title.trim()}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
                          >
                            {isAssigning ? "Menyimpan..." : "Tambah ke Galeri"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-6 text-sm text-gray-500">
                        Pilih salah satu gambar dari arsip untuk ditambahkan ke
                        galeri.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowArchivePickerModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={isAssigning}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailModal && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedImage.title}
                  </h3>
                  {getCategoryBadge(selectedImage.category)}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedImage.imageUrl}
                    download
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Download"
                    onClick={() => {
                      fetch(`/api/digital-archives/${selectedImage.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "download" }),
                      }).catch(() => {});
                    }}
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <a
                    href="/arsip"
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Kelola di Arsip"
                  >
                    Kelola di Arsip
                  </a>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="aspect-video w-full bg-gray-100">
                  <Image
                    src={selectedImage.imageUrl}
                    alt={selectedImage.title}
                    className="w-full h-full object-contain"
                    width={900}
                    height={520}
                  />
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Deskripsi
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedImage.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Diupload oleh
                      </p>
                      <p className="font-medium text-gray-900">
                        {selectedImage.uploadedBy}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Tanggal Upload
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedImage.uploadDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tayangan</p>
                      <p className="font-medium text-gray-900">
                        {selectedImage.viewsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ukuran File</p>
                      <p className="font-medium text-gray-900">
                        {formatFileSize(selectedImage.fileSizeBytes)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
