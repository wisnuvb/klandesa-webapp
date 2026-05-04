export function slugifyBlog(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .slice(0, 200)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

