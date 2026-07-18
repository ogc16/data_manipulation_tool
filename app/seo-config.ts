export const SITE = {
  name: "Data Tools",
  url: "https://dt.techgaetano.com/",
  description:
    "Free online utility for file conversion, data analysis, compression, encryption, and document scanning. No uploads — everything runs in your browser.",
  locale: "en_US",
  twitter: "",
  ogImage: "/og-image.png",
} as const;

export function pageUrl(path: string) {
  return new URL(path, SITE.url).href;
}

export function meta(
  overrides: {
    title?: string;
    description?: string;
    keywords?: string[];
    path?: string;
    ogImage?: string;
    noindex?: boolean;
  } = {}
) {
  // Root layout uses `title: { default, template: "%s | Data Tools" }`.
  // Child layouts must return ONLY the unique part (no site name suffix)
  // so the template appends it exactly once.
  const title = overrides.title ?? `${SITE.name} — Free Online File Tools`;
  const description = overrides.description ?? SITE.description;
  const canonical = overrides.path ?? "/";
  const keywords = overrides.keywords ?? [];

  return {
    title,
    description,
    keywords: keywords.join(", "),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: pageUrl(canonical),
      siteName: SITE.name,
      locale: SITE.locale,
      type: "website" as const,
      images: [{ url: pageUrl(overrides.ogImage ?? SITE.ogImage), width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [pageUrl(overrides.ogImage ?? SITE.ogImage)],
    },
    robots: {
      index: !overrides.noindex,
      follow: !overrides.noindex,
    },
  };
}
