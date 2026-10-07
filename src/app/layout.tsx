import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "my mind — visual memory",
  description: "A private visual memory space for notes, links, images and ideas.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
