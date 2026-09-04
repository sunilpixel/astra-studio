import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

// Two faces: a didone for everything that speaks, a grotesk tracked
// wide for everything that labels.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASTRA — Nothing Is Still",
  description:
    "Volume 01 / Object. Twenty things photographed against nothing, and the space they leave behind.",
  openGraph: {
    title: "ASTRA — Nothing Is Still",
    description: "Volume 01 / Object. An interactive study of objects.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
