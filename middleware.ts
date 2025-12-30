import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSubdomain,
  isMainDomain,
  isAppSubdomain,
  isTenantSubdomain,
} from "@/lib/subdomain";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const subdomain = getSubdomain(req);

  console.log("Middleware:", { hostname, subdomain, pathname: url.pathname });

  // Handle main domain (landing page)
  if (isMainDomain(subdomain)) {
    // Allow public access to landing page
    if (url.pathname === "/" || url.pathname.startsWith("/(landing)")) {
      return NextResponse.next();
    }

    // Rewrite to landing routes
    if (
      !url.pathname.startsWith("/_next") &&
      !url.pathname.startsWith("/api")
    ) {
      return NextResponse.rewrite(
        new URL(`/(landing)${url.pathname}`, req.url)
      );
    }
  }

  // Handle app subdomain (dashboard)
  if (isAppSubdomain(subdomain)) {
    // NOTE: Cannot call auth() in middleware (edge runtime)
    // Just allow the request and let pages handle auth

    // Allow auth routes
    if (url.pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    // Allow public routes
    if (url.pathname.startsWith("/auth")) {
      return NextResponse.next();
    }

    // Rewrite to app routes
    if (
      !url.pathname.startsWith("/_next") &&
      !url.pathname.startsWith("/api")
    ) {
      // Serve '/' from the internal (app)/dashboard page to avoid parallel root pages
      if (url.pathname === "/") {
        // Route groups like (app) are not part of the URL; rewrite to the actual path
        return NextResponse.rewrite(new URL(`/dashboard`, req.url));
      }
      // Keep the same pathname; route groups are ignored by the router
      return NextResponse.rewrite(new URL(`${url.pathname}`, req.url));
    }
  }

  // Handle tenant subdomains (tenant websites)
  if (isTenantSubdomain(subdomain)) {
    // Store subdomain in header for use in app
    const requestHeaders = new Headers(req.headers);
    if (subdomain) {
      requestHeaders.set("x-tenant-subdomain", subdomain);
    }

    // Rewrite to website routes with tenant context
    if (
      !url.pathname.startsWith("/_next") &&
      !url.pathname.startsWith("/api")
    ) {
      // Serve '/' from the internal (website)/site page to avoid parallel root pages
      if (url.pathname === "/") {
        return NextResponse.rewrite(new URL(`/(website)/site`, req.url), {
          request: { headers: requestHeaders },
        });
      }
      return NextResponse.rewrite(
        new URL(`/(website)${url.pathname}`, req.url),
        { request: { headers: requestHeaders } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
