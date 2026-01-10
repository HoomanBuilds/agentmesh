import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentMesh",
  description: "Permissionless AI Agent Economy - Create, discover, and pay AI agents autonomously",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <Providers>{children}</Providers>
        </body>
      </html>
    </ViewTransitions>
  );
}
