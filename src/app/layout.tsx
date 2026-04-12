import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/ui/providers";
import { AppToaster } from "@/components/ui/toaster";
import { auth } from "@/lib/auth";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ABC (Always Be Coloring)",
  description: "Generate custom coloring PDFs from prompts or uploads.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=1", type: "image/png", sizes: "32x32" }
    ],
    shortcut: "/favicon-32x32.png?v=1"
  }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <Providers session={session}>
          {children}
          <AppToaster />
        </Providers>
      </body>
    </html>
  );
}
