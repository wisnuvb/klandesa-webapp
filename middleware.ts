import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INVOKE_PATHNAME_HEADER } from "@/lib/middleware-headers";
import {
  getSubdomain,
  isMainDomain,
  isAppSubdomain,
  isTenantSubdomain,
} from "@/lib/subdomain";

function nextWithPathname(req: NextRequest): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(INVOKE_PATHNAME_HEADER, req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function rewriteWithPathname(req: NextRequest, target: URL): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(INVOKE_PATHNAME_HEADER, req.nextUrl.pathname);
  return NextResponse.rewrite(target, { request: { headers: requestHeaders } });
}

/**
 * Tidak memakai getToken/JWT di Edge — sering tidak kompatibel dengan JWE NextAuth.
 * Proteksi rute app: app/(app)/layout.tsx memanggil auth() (Node) + redirect.
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const subdomain = getSubdomain(req);

  if (process.env.DEBUG_MIDDLEWARE === "1") {
    console.log("Middleware:", {
      hostname: req.headers.get("host"),
      subdomain,
      pathname: url.pathname,
    });
  }

  if (isMainDomain(subdomain)) {
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api")) {
      return nextWithPathname(req);
    }

    if (url.pathname === "/") {
      return NextResponse.next();
    }

    return rewriteWithPathname(req, new URL(url.pathname, req.url));
  }

  if (isAppSubdomain(subdomain)) {
    if (url.pathname.startsWith("/api/auth")) {
      return nextWithPathname(req);
    }

    if (url.pathname.startsWith("/api")) {
      return nextWithPathname(req);
    }

    if (url.pathname.startsWith("/auth")) {
      return nextWithPathname(req);
    }

    if (
      !url.pathname.startsWith("/_next") &&
      !url.pathname.startsWith("/api")
    ) {
      if (url.pathname === "/") {
        return rewriteWithPathname(req, new URL(`/dashboard`, req.url));
      }
      return rewriteWithPathname(req, new URL(`${url.pathname}`, req.url));
    }
  }

  if (isTenantSubdomain(subdomain)) {
    const requestHeaders = new Headers(req.headers);
    if (subdomain) {
      requestHeaders.set("x-tenant-subdomain", subdomain);
    }
    requestHeaders.set(INVOKE_PATHNAME_HEADER, req.nextUrl.pathname);

    if (
      !url.pathname.startsWith("/_next") &&
      !url.pathname.startsWith("/api")
    ) {
      if (url.pathname === "/") {
        return NextResponse.rewrite(new URL(`/(website)/site`, req.url), {
          request: { headers: requestHeaders },
        });
      }
      return NextResponse.rewrite(
        new URL(`/(website)${url.pathname}`, req.url),
        { request: { headers: requestHeaders } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
