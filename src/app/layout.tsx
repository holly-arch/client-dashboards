import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORRJO | Campaign Dashboard",
  description: "Campaign performance dashboard powered by ORRJO",
  icons: {
    icon: '/favicon.svg',
  },
};

// Runs before React hydration so users see the correct theme instantly rather
// than a flash of light-mode default followed by the stored dark preference.
// Reads localStorage.dashboard_theme (populated by ThemeToggle) and stamps
// data-theme on <html> if set to 'dark'. Default (no key) = light.
const themeInitScript = `
(function(){try{var t=localStorage.getItem('dashboard_theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
