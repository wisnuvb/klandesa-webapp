"use client";

import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  FolderPlus,
  Grid3x3,
  HardDrive,
  Home,
  List,
  MoreVertical,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canAccessArchiveBinary,
  canDeleteArchiveRecord,
  canManageArchiveFolders,
} from "@/lib/digitalArchive/access";
import { toast } from "sonner";
import type { FileItem, FileType, ViewMode } from "../_types";
import {
  archiveThumbnailNeedsUnoptimized,
  formatFileSize,
  getFileIcon,
  getQuotaTextColor,
} from "../_utils/fileUtils";

function folderDisplayPath(file: FileItem): string {
  if (file.kind === "folderDb" && file.folderPath) {
    const p = file.folderPath.trim();
    return p.startsWith("/") ? p : `/${p}`;
  }
  const base = file.parent_folder.replace(/\/+$/, "");
  const name = file.name.replace(/^\/+|\/+$/g, "");
  if (!base) return `/${name}`;
  return `${base}/${name}`;
}

function fileShareUrl(file: FileItem, origin: string): string | null {
  if (
    file.type !== "file" ||
    file.archiveId == null ||
    file.uploadedByUserId == null ||
    file.isPublic == null
  ) {
    return null;
  }
  if (file.isPublic && file.filePath && /^https?:\/\//i.test(file.filePath)) {
    return file.filePath;
  }
  return `${origin}/api/digital-archives/${file.archiveId}/file`;
}

interface ArchiveItemActionMenuProps {
  file: FileItem;
  variant: "grid" | "list";
  userId: number;
  role: string | undefined;
  origin: string;
  onPreview: (f: FileItem) => void;
  onFileClick: (f: FileItem) => void;
  onDeleteItem: (f: FileItem) => void | Promise<void>;
}

function ArchiveItemActionMenu(props: ArchiveItemActionMenuProps) {
  const {
    file,
    variant,
    userId,
    role,
    origin,
    onPreview,
    onFileClick,
    onDeleteItem,
  } = props;

  const isFile = file.type === "file";
  const sessionReady = Number.isFinite(userId) && userId > 0;

  const canViewBinary =
    isFile &&
    sessionReady &&
    file.uploadedByUserId != null &&
    file.isPublic != null &&
    canAccessArchiveBinary({
      role,
      userId,
      isPublic: file.isPublic,
      uploadedByUserId: file.uploadedByUserId,
    });

  const folderPathText = !isFile ? folderDisplayPath(file) : null;

  const copyDisabled =
    isFile
      ? !sessionReady || !canViewBinary || !origin
      : !folderPathText;

  const canDeleteFile =
    isFile &&
    sessionReady &&
    file.uploadedByUserId != null &&
    canDeleteArchiveRecord({
      role,
      userId,
      uploadedByUserId: file.uploadedByUserId,
    });

  const canDeleteFolderDb =
    !isFile &&
    file.kind === "folderDb" &&
    file.folderDbId != null &&
    canManageArchiveFolders(role);

  const showDelete = Boolean(canDeleteFile || canDeleteFolderDb);

  const triggerClass =
    variant === "grid"
      ? "p-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 outline-none"
      : "p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg outline-none";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={triggerClass}
            title="Lainnya"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical
              className={variant === "grid" ? "w-3 h-3 text-gray-600" : "w-4 h-4"}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem
            disabled={Boolean(isFile && !canViewBinary)}
            onSelect={() => {
              if (isFile) {
                if (!canViewBinary) {
                  toast.error("Akses ditolak", {
                    description:
                      "Anda tidak memiliki akses ke berkas ini (arsip privat milik pengguna lain, atau sesi belum siap).",
                  });
                  return;
                }
                onPreview(file);
                return;
              }
              onFileClick(file);
            }}
          >
            <Eye className="w-4 h-4" />
            {isFile ? "Lihat / pratinjau" : "Buka folder"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={copyDisabled}
            onSelect={() => {
              void (async () => {
                if (isFile) {
                  const url = fileShareUrl(file, origin);
                  if (!url || !canViewBinary) {
                    toast.error("Perhatian", {
                      description:
                        "Tidak ada tautan yang dapat disalin untuk item ini.",
                    });
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Disalin", {
                      description: file.isPublic
                        ? "Tautan publik disalin ke papan klip."
                        : "Tautan disalin. Berkas privat hanya dapat dibuka oleh Anda dan admin desa saat masuk.",
                    });
                  } catch {
                    toast.error("Gagal", {
                      description: "Gagal menyalin ke papan klip.",
                    });
                  }
                  return;
                }
                if (folderPathText) {
                  try {
                    await navigator.clipboard.writeText(folderPathText);
                    toast.success("Disalin", {
                      description: "Path folder disalin ke papan klip.",
                    });
                  } catch {
                    toast.error("Gagal", {
                      description: "Gagal menyalin ke papan klip.",
                    });
                  }
                }
              })();
            }}
          >
            <Copy className="w-4 h-4" />
            {isFile ? "Salin tautan" : "Salin path folder"}
          </DropdownMenuItem>
          {showDelete ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                void (async () => {
                  if (!showDelete) {
                    toast.error("Tidak dapat dihapus", {
                      description: "Anda tidak dapat menghapus item ini.",
                    });
                    return;
                  }
                  if (!isFile && file.kind !== "folderDb") {
                    toast.error("Tidak dapat dihapus", {
                      description:
                        "Folder kategori ini tidak dapat dihapus dari sini.",
                    });
                    return;
                  }
                  await onDeleteItem(file);
                })();
              }}
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface Props {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentPath: string;
  pathSegments: string[];
  onBreadcrumbClick: (index: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: FileType | "ALL";
  setFilterType: (t: FileType | "ALL") => void;
  sortBy: "name" | "date" | "size";
  setSortBy: (s: "name" | "date" | "size") => void;
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
  toggleFileSelection: (key: string) => void;
  onDeleteSelected: () => void;
  onFileClick: (file: FileItem) => void;
  filteredFiles: FileItem[];
  usedBytes: number;
  usagePercentage: number;
  fileCount: number;
  onClickNewFolder: () => void;
  onClickUpload: () => void;
  onPreview: (file: FileItem) => void;
  /** Hapus satu file/folder DB; ACL dicek di API */
  onDeleteItem: (file: FileItem) => void | Promise<void>;
}

export function FileManager(props: Props) {
  const {
    viewMode,
    setViewMode,
    currentPath,
    pathSegments,
    onBreadcrumbClick,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    selectedKeys,
    setSelectedKeys,
    toggleFileSelection,
    onDeleteSelected,
    onFileClick,
    filteredFiles,
    usedBytes,
    usagePercentage,
    fileCount,
    onClickNewFolder,
    onClickUpload,
    onPreview,
    onDeleteItem,
  } = props;

  const { data: session } = useSession();

  const userId = session?.user?.id ? Number(session.user.id) : NaN;
  const role = session?.user?.role;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const selectableIds = filteredFiles
    .filter((f) => f.selectable)
    .map((f) => f.selectionKey);

  return (
    <div className="lg:col-span-9 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total File</p>
              <p className="text-3xl font-bold text-gray-900">{fileCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-gray-600 mb-1">Total Ukuran</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatFileSize(usedBytes)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-purple-600" />
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
              <p className="text-sm text-gray-600 mb-1">Kuota Terpakai</p>
              <p
                className={`text-3xl font-bold ${getQuotaTextColor(
                  usagePercentage,
                )}`}
              >
                {usagePercentage.toFixed(1)}%
              </p>
            </div>
            <div
              className={`w-12 h-12 ${
                usagePercentage >= 90
                  ? "bg-red-100"
                  : usagePercentage >= 70
                    ? "bg-yellow-100"
                    : "bg-teal-100"
              } rounded-lg flex items-center justify-center`}
            >
              <HardDrive
                className={`w-6 h-6 ${
                  usagePercentage >= 90
                    ? "text-red-600"
                    : usagePercentage >= 70
                      ? "text-yellow-600"
                      : "text-teal-600"
                }`}
              />
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200"
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onBreadcrumbClick(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4 text-gray-600" />
              </button>
              {pathSegments.map((segment, index) => (
                <div
                  key={`${segment}-${index}`}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => onBreadcrumbClick(index)}
                    className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                  >
                    {segment}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClickNewFolder}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Folder Baru</span>
              </button>
              <button
                onClick={onClickUpload}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload File</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-teal-50 text-teal-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-teal-50 text-teal-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari file atau folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(e.target.value as FileType | "ALL")
                  }
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white text-sm"
                >
                  <option value="ALL">Semua Tipe</option>
                  <option value="IMAGE">Gambar</option>
                  <option value="DOCUMENT">Dokumen</option>
                  <option value="PDF">PDF</option>
                  <option value="EXCEL">Excel</option>
                  <option value="ARCHIVE">Arsip</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "name" | "date" | "size")
                  }
                  className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white text-sm"
                >
                  <option value="name">Nama</option>
                  <option value="date">Tanggal</option>
                  <option value="size">Ukuran</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedKeys.length > 0 && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="text-sm text-teal-900">
                {selectedKeys.length} item dipilih
              </span>
              <button
                onClick={onDeleteSelected}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
              <button
                onClick={() => setSelectedKeys([])}
                className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-3 h-3" />
                Batal
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <motion.div
                  key={file.selectionKey}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative group border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedKeys.includes(file.selectionKey)
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-teal-300 hover:shadow-md"
                  }`}
                  onClick={() => onFileClick(file)}
                >
                  {file.selectable ? (
                    <div
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFileSelection(file.selectionKey);
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          selectedKeys.includes(file.selectionKey)
                            ? "bg-teal-600 border-teal-600"
                            : "bg-white border-gray-300 group-hover:border-teal-400"
                        }`}
                      >
                        {selectedKeys.includes(file.selectionKey) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col items-center mb-3">
                    {file.thumbnail_url && file.file_type === "IMAGE" ? (
                      <Image
                        src={file.thumbnail_url}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                        width={175}
                        height={175}
                        unoptimized={archiveThumbnailNeedsUnoptimized(
                          file.thumbnail_url,
                        )}
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center">
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p
                      className="text-sm font-medium text-gray-900 truncate mb-1"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArchiveItemActionMenu
                      file={file}
                      variant="grid"
                      userId={userId}
                      role={role}
                      origin={origin}
                      onPreview={onPreview}
                      onFileClick={onFileClick}
                      onDeleteItem={onDeleteItem}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKeys(selectableIds);
                          } else {
                            setSelectedKeys([]);
                          }
                        }}
                        checked={
                          selectedKeys.length === selectableIds.length &&
                          selectableIds.length > 0
                        }
                        className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ukuran
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diubah
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oleh
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <motion.tr
                      key={file.selectionKey}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedKeys.includes(file.selectionKey)
                          ? "bg-teal-50"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          disabled={!file.selectable}
                          checked={selectedKeys.includes(file.selectionKey)}
                          onChange={() => toggleFileSelection(file.selectionKey)}
                          className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 disabled:opacity-40"
                        />
                      </td>
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => onFileClick(file)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            {file.thumbnail_url &&
                            file.file_type === "IMAGE" ? (
                              <Image
                                src={file.thumbnail_url}
                                alt={file.name}
                                className="w-10 h-10 object-cover rounded"
                                unoptimized={archiveThumbnailNeedsUnoptimized(
                                  file.thumbnail_url,
                                )}
                                width={40}
                                height={40}
                              />
                            ) : (
                              getFileIcon(file)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {file.name}
                            </p>
                            {file.extension && (
                              <p className="text-xs text-gray-500 uppercase">
                                {file.extension}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(file.modified_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {file.uploaded_by}
                      </td>
                      <td
                        className="px-4 py-3 text-right align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex justify-end">
                          <ArchiveItemActionMenu
                            file={file}
                            variant="list"
                            userId={userId}
                            role={role}
                            origin={origin}
                            onPreview={onPreview}
                            onFileClick={onFileClick}
                            onDeleteItem={onDeleteItem}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Tidak ada file atau folder</p>
              <p className="text-sm text-gray-400 mt-1">
                {currentPath === "/"
                  ? "Belum ada kategori arsip"
                  : "Upload file atau buat folder baru untuk memulai"}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
