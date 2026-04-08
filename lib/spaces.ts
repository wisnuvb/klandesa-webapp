import { S3Client } from "@aws-sdk/client-s3";

/**
 * Upload browser ke Spaces memakai presigned PUT. Pastikan CORS bucket mengizinkan
 * origin aplikasi, method PUT, header Content-Type & x-amz-acl (jika dipakai).
 */
export function getSpacesConfig() {
  const region = process.env.SPACES_REGION;
  const bucket = process.env.SPACES_BUCKET;
  const endpoint =
    process.env.SPACES_ENDPOINT || (region ? `https://${region}.digitaloceanspaces.com` : undefined);

  const accessKeyId = process.env.SPACES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;

  if (!region) throw new Error("SPACES_REGION is not set");
  if (!bucket) throw new Error("SPACES_BUCKET is not set");
  if (!endpoint) throw new Error("SPACES_ENDPOINT is not set");
  if (!accessKeyId) throw new Error("SPACES_ACCESS_KEY_ID is not set");
  if (!secretAccessKey) throw new Error("SPACES_SECRET_ACCESS_KEY is not set");

  const cdnBaseUrl =
    process.env.SPACES_CDN_BASE_URL || `https://${bucket}.${region}.digitaloceanspaces.com`;

  return {
    region,
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    cdnBaseUrl,
    uploadAcl: process.env.SPACES_UPLOAD_ACL || "public-read",
  };
}

export function getSpacesClient() {
  const cfg = getSpacesConfig();
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export function buildSpacesPublicUrl(key: string) {
  const cfg = getSpacesConfig();
  const base = cfg.cdnBaseUrl.replace(/\/+$/, "");
  const path = key.replace(/^\/+/, "");
  return `${base}/${path}`;
}

/** Mengambil object key dari URL publik CDN Spaces (path tanpa slash depan). */
export function publicUrlToStorageKey(publicUrl: string): string | null {
  if (!publicUrl || !/^https?:\/\//i.test(publicUrl)) return null;
  try {
    const cfg = getSpacesConfig();
    const base = new URL(cfg.cdnBaseUrl.replace(/\/+$/, ""));
    const u = new URL(publicUrl);
    if (u.host !== base.host) return null;
    const pathname = u.pathname.replace(/^\/+/, "");
    return pathname || null;
  } catch {
    return null;
  }
}
