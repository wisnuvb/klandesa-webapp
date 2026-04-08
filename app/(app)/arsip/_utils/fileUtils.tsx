import {
  Archive,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
} from "lucide-react";
import {
  browseParentFromFolderPath,
  browsePathFromFolderPath,
} from "@/lib/digitalArchive/folderPath";
import type { ArchiveEntry, ArchiveFolderEntry, FileItem, FileType } from "../_types";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getQuotaColor(usagePercentage: number) {
  if (usagePercentage >= 90) return "bg-red-500";
  if (usagePercentage >= 70) return "bg-yellow-500";
  return "bg-teal-500";
}

export function getQuotaTextColor(usagePercentage: number) {
  if (usagePercentage >= 90) return "text-red-600";
  if (usagePercentage >= 70) return "text-yellow-600";
  return "text-teal-600";
}

export function inferFileTypeFromFileTypeString(fileType: string): FileType {
  const ext = (fileType || "").toLowerCase().replace(/^\./, "");
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)
  ) {
    return "IMAGE";
  }
  if (ext === "pdf") return "PDF";
  if (["xls", "xlsx", "csv"].includes(ext)) return "EXCEL";
  if (["doc", "docx", "odt", "rtf", "txt"].includes(ext)) return "DOCUMENT";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "ARCHIVE";
  return "OTHER";
}

export function getExtensionFromFileName(fileName: string): string | undefined {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return undefined;
  return fileName.slice(idx + 1).toLowerCase();
}

export function getFileIcon(file: FileItem) {
  if (file.type === "folder") {
    return <FolderOpen className="w-8 h-8 text-yellow-500" />;
  }

  switch (file.file_type) {
    case "IMAGE":
      return <ImageIcon className="w-8 h-8 text-purple-500" />;
    case "PDF":
      return <FileText className="w-8 h-8 text-red-500" />;
    case "EXCEL":
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    case "DOCUMENT":
      return <FileText className="w-8 h-8 text-blue-500" />;
    case "ARCHIVE":
      return <Archive className="w-8 h-8 text-orange-500" />;
    default:
      return <File className="w-8 h-8 text-gray-500" />;
  }
}

function stableNegativeId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const safe = Math.abs(hash) || 1;
  return -safe;
}

function normSegPath(p: string): string {
  return p.replace(/\/+/g, "/").replace(/\/+$/, "") || "";
}

export function buildVirtualFsItems(
  entries: ArchiveEntry[],
  dbFolders: ArchiveFolderEntry[],
): FileItem[] {
  const folderPathById = new Map(
    dbFolders.map((f) => [f.id, f.path] as const),
  );
  const dbPathNormSet = new Set(
    dbFolders.map((f) => normSegPath(f.path)),
  );

  const files: FileItem[] = entries.map((entry) => {
    const ext =
      getExtensionFromFileName(entry.fileName) ||
      entry.fileType?.toLowerCase() ||
      undefined;
    const fileType = inferFileTypeFromFileTypeString(ext || "other");

    let parentFolder: string;
    if (entry.folderId != null && folderPathById.has(entry.folderId)) {
      parentFolder = browsePathFromFolderPath(
        folderPathById.get(entry.folderId)!,
      );
    } else {
      parentFolder =
        entry.subCategory && entry.subCategory.trim()
          ? `/${entry.category}/${entry.subCategory}/`
          : `/${entry.category}/`;
    }

    const thumbnailUrl =
      fileType === "IMAGE" && /^https?:\/\//.test(entry.filePath)
        ? entry.filePath
        : undefined;

    return {
      id: entry.id,
      selectionKey: `a:${entry.id}`,
      selectable: true,
      kind: "file",
      name: entry.fileName,
      type: "file",
      file_type: fileType,
      extension: ext,
      size: entry.fileSize,
      created_at: entry.createdAt,
      modified_at: entry.updatedAt,
      parent_folder: parentFolder,
      thumbnail_url: thumbnailUrl,
      uploaded_by: entry.uploadedByName,
      archiveId: entry.id,
    };
  });

  const byCategory = new Map<string, FileItem[]>();
  const byCategorySub = new Map<string, FileItem[]>();

  for (const file of files) {
    const entry = entries.find((e) => e.id === file.archiveId);
    if (entry?.folderId != null) continue;

    const segments = file.parent_folder.split("/").filter(Boolean);
    const category = segments[0];
    if (!category) continue;

    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(file);

    const sub = segments[1];
    if (sub) {
      const subKey = `${category}///${sub}`;
      if (!byCategorySub.has(subKey)) byCategorySub.set(subKey, []);
      byCategorySub.get(subKey)!.push(file);
    }
  }

  const folderItems: FileItem[] = [];

  for (const fd of dbFolders) {
    folderItems.push({
      id: fd.id,
      selectionKey: `f:${fd.id}`,
      selectable: true,
      kind: "folderDb",
      name: fd.name,
      type: "folder",
      size: 0,
      created_at: fd.createdAt,
      modified_at: fd.updatedAt,
      parent_folder: browseParentFromFolderPath(fd.path),
      uploaded_by: "",
      folderDbId: fd.id,
      folderPath: fd.path,
    });
  }

  for (const [category, categoryFiles] of byCategory.entries()) {
    const legacyPath = normSegPath(`/${category}`);
    if (dbPathNormSet.has(legacyPath)) continue;

    const lastModified = categoryFiles.reduce((acc, f) => {
      const ts = new Date(f.modified_at).getTime();
      return ts > acc ? ts : acc;
    }, 0);

    folderItems.push({
      id: stableNegativeId(`cat:${category}`),
      selectionKey: `v:cat:${category}`,
      selectable: false,
      kind: "folderVirtual",
      name: category,
      type: "folder",
      size: categoryFiles.reduce((acc, f) => acc + f.size, 0),
      created_at: new Date(
        Math.min(...categoryFiles.map((f) => new Date(f.created_at).getTime())),
      ).toISOString(),
      modified_at: new Date(lastModified || Date.now()).toISOString(),
      parent_folder: "/",
      uploaded_by: "",
    });
  }

  for (const [key, subFiles] of byCategorySub.entries()) {
    const [category, subCategory] = key.split("///");
    const legacyPath = normSegPath(`/${category}/${subCategory}`);
    if (dbPathNormSet.has(legacyPath)) continue;

    const lastModified = subFiles.reduce((acc, f) => {
      const ts = new Date(f.modified_at).getTime();
      return ts > acc ? ts : acc;
    }, 0);

    folderItems.push({
      id: stableNegativeId(`sub:${category}/${subCategory}`),
      selectionKey: `v:sub:${category}/${subCategory}`,
      selectable: false,
      kind: "folderVirtual",
      name: subCategory,
      type: "folder",
      size: subFiles.reduce((acc, f) => acc + f.size, 0),
      created_at: new Date(
        Math.min(...subFiles.map((f) => new Date(f.created_at).getTime())),
      ).toISOString(),
      modified_at: new Date(lastModified || Date.now()).toISOString(),
      parent_folder: `/${category}/`,
      uploaded_by: "",
    });
  }

  return [...folderItems, ...files];
}

export function calculateFileStats(fileItems: FileItem[]) {
  const filesOnly = fileItems.filter((f) => f.type === "file");
  return {
    usedBytes: filesOnly.reduce((acc, f) => acc + f.size, 0),
    fileCount: filesOnly.length,
    images: filesOnly
      .filter((f) => f.file_type === "IMAGE")
      .reduce((acc, f) => acc + f.size, 0),
    documents: filesOnly
      .filter((f) => f.file_type === "DOCUMENT")
      .reduce((acc, f) => acc + f.size, 0),
    pdfs: filesOnly
      .filter((f) => f.file_type === "PDF")
      .reduce((acc, f) => acc + f.size, 0),
    excel: filesOnly
      .filter((f) => f.file_type === "EXCEL")
      .reduce((acc, f) => acc + f.size, 0),
    archives: filesOnly
      .filter((f) => f.file_type === "ARCHIVE")
      .reduce((acc, f) => acc + f.size, 0),
    others: filesOnly
      .filter((f) => f.file_type === "OTHER")
      .reduce((acc, f) => acc + f.size, 0),
  };
}
