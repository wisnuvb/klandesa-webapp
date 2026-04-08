/** Segmen aman untuk path folder (tanpa slash). */
export function slugFolderSegment(name: string): string {
  const s = name.trim().slice(0, 200);
  const base = s
    .replace(/[/\\]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_\u00C0-\u024F]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "folder";
}

/** Path penuh: `/a` atau `/a/b` (tanpa trailing slash). */
export function buildFolderPath(
  parentPath: string | null | undefined,
  segment: string,
): string {
  const seg = slugFolderSegment(segment);
  if (!parentPath) return `/${seg}`;
  const p = parentPath.replace(/\/+$/, "");
  return `${p}/${seg}`;
}

/** Untuk kolom legacy `category` / `subCategory` dari path folder. */
export function categorySubFromFolderPath(folderPath: string): {
  category: string;
  subCategory: string | null;
} {
  const segments = folderPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { category: "Arsip", subCategory: null };
  }
  if (segments.length === 1) {
    return { category: segments[0], subCategory: null };
  }
  return {
    category: segments[0],
    subCategory: segments.slice(1).join("/"),
  };
}

/** Path folder `/a/b` -> parent folder untuk browse: `/a/`. */
export function browseParentFromFolderPath(folderPath: string): string {
  const trimmed = folderPath.replace(/\/+$/, "");
  const last = trimmed.lastIndexOf("/");
  if (last <= 0) return "/";
  return `${trimmed.slice(0, last)}/`;
}

/** Path folder ke path browse (selalu diakhiri `/`). */
export function browsePathFromFolderPath(folderPath: string): string {
  const p = folderPath.replace(/\/+$/, "");
  if (!p) return "/";
  return `${p}/`;
}
