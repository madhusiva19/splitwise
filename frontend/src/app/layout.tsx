import type { Metadata } from "next";
import { Space_Mono, Inter } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Splitwise",
  description: "Group expense splitting, kept simple.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        {/* Runs before paint so an explicit stored theme choice applies immediately,
            instead of flashing the default light theme first. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
