import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerPublicPageClient } from "@/components/features/partner-public/PartnerPublicPageClient";
import { buildLandingSeo } from "@/lib/seo/landing";
import { resolvePartnerPublicProfile } from "@/lib/partner/public-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await resolvePartnerPublicProfile(slug);
  if (!profile) {
    return {
      title: "Halaman tidak ditemukan | Klandesa",
      robots: "noindex, nofollow",
    };
  }

  const title = `${profile.name} — Digitalisasi Desa`;
  const description =
    profile.publicBio?.trim()?.slice(0, 160) ||
    `${profile.name} memperkenalkan Klandesa untuk digitalisasi desa dan pemda${
      profile.region ? ` di ${profile.region}` : ""
    }.`;

  const seo = buildLandingSeo(`/m/${profile.slug}`, title, description);

  return {
    title: seo.title,
    description: seo.description,
    robots: "index, follow",
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: "website",
      locale: "id_ID",
      title: seo.title,
      description: seo.description,
      url: seo.canonical,
      images: [{ url: seo.ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage],
    },
  };
}

export default async function PartnerPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await resolvePartnerPublicProfile(slug);
  if (!profile) notFound();

  return <PartnerPublicPageClient profile={profile} />;
}
