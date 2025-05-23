import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Metadata } from "next";
import { AppWithProviders } from "~~/components/AppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

export const metadata: Metadata = {
  title: "ZKsync Prividium Escrow Trade",
  description: "ZKsync Prividium Escrow Trade Demo",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ThemeProvider forcedTheme="dark" attribute="class">
          <AppWithProviders>{children}</AppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
