import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HealthRecon",
  description: "Personal intelligence layer for healthcare systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}

