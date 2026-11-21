import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DeskFlow · IT Service Desk",
  description: "Local IT service desk queue management",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
