import type { Metadata } from "next";
import { SUSE } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/layout/toaster";
import { ThemeProvider } from "next-themes";

const suse = SUSE({
  variable: "--font-suse",
  subsets: ["latin"],
});

const BASE_URL = "https://creatorjot.com"
const OG_IMAGE = `${BASE_URL}/assets/og-image.png`
const TITLE = "CreatorJot | Turn 1 YouTube Video Into 10+ Social Media Posts"
const DESCRIPTION =
  "Paste a YouTube link and CreatorJot instantly generates Twitter threads, LinkedIn posts, and blog drafts. Built for creators, founders, and indie hackers. Free to try."

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: "%s | CreatorJot",
  },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "CreatorJot",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "CreatorJot — Turn 1 YouTube Video Into 10+ Social Media Posts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@creatorjot",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
        <link rel="icon" type="image/png" href="/pwa/favicon-96x96.png?v=4" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/pwa/favicon.svg?v=4" />
        <link rel="shortcut icon" href="/pwa/favicon.ico?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa/apple-touch-icon.png?v=4" />
        <meta name="apple-mobile-web-app-title" content="CreatorJot" />
        <link rel="manifest" href="/pwa/site.webmanifest?v=4" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
              }}
            />
          </>
        )}
      </head>
      <body className={`${suse.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
