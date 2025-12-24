import "./globals.css";
import type { Metadata } from "next";
import type React from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AEO/GEO Analysis Engine",
  description: "Minimal analysis kernel MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
