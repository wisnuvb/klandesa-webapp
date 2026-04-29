import Link from "next/link";
import type { WebsiteNavItem } from "@/lib/website-engine/types";

function normalizePath(p: string): string {
  let x = (p.split("?")[0] || "/").trim();
  if (!x.startsWith("/")) x = `/${x}`;
  if (x.length > 1 && x.endsWith("/")) x = x.slice(0, -1);
  return x || "/";
}

function isHome(p: string): boolean {
  const n = normalizePath(p);
  return n === "/" || n === "/site";
}

export function TenantNavBar(props: {
  items: WebsiteNavItem[];
  /** Path ter-invoke dari middleware, mis. `/site`, `/tentang` */
  currentPath: string;
}) {
  const { items, currentPath } = props;
  if (!items.length) return null;

  const cur = normalizePath(currentPath);

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
      {items.map((item, i) => {
        const rawHref =
          item.href.startsWith("http") || item.href.startsWith("/")
            ? item.href
            : `/${item.href}`;
        const isActive = (() => {
          if (item.external) return false;
          const target = normalizePath(rawHref);
          if (isHome(target) && isHome(cur)) return true;
          return cur === target;
        })();
        const linkClass =
          isActive
            ? "underline [color:var(--site-primary,inherit)] font-semibold"
            : "opacity-90 hover:underline [color:var(--site-muted-foreground,#57534e)]";
        const useNextLink = !item.external && rawHref.startsWith("/");

        return (
          <li key={`${rawHref}-${i}`}>
            {useNextLink ? (
              <Link href={rawHref} className={linkClass}>
                {item.label}
              </Link>
            ) : (
              <a
                href={rawHref}
                {...(item.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={linkClass}
              >
                {item.label}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
