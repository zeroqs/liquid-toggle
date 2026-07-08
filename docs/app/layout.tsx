import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";

export const metadata = {
  title: {
    template: "%s | liquid-toggle",
    default: "liquid-toggle",
  },
  description:
    "Liquid-glass segmented toggle for React, rendered with a WebGL lens over a canvas track.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
