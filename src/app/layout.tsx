import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oakwood Maintenance",
  description: "Oakwood Property Management — maintenance request system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
