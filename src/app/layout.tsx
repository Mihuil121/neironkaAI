import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeClient from '@/components/ThemeClient';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neironka AI — чат-бот, AI-поиск, мышление, файлы и приватность",
  description: "Neironka AI — умный чат-бот с AI-поиском, reasoning, поддержкой файлов, YouTube, приватностью и современным UX. Быстро, удобно, бесплатно!",
  keywords: "AI, чат-бот, нейросеть, искусственный интеллект, reasoning, web search, мышление, Neironka, Fox AI, GPT, DeepThink, приватность, файлы, YouTube, анализ, поиск, генерация текста, Qwen, DeepSeek, Cypher",
  openGraph: {
    title: "Neironka AI — чат-бот, AI-поиск, reasoning, файлы и приватность",
    description: "Neironka AI — умный чат-бот с AI-поиском, reasoning, поддержкой файлов, YouTube, приватностью и современным UX.",
    images: [
      {
        url: "/image/AI.png",
        width: 512,
        height: 512,
        alt: "Neironka AI logo"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Neironka AI — чат-бот, AI-поиск, reasoning, файлы и приватность",
    description: "Neironka AI — умный чат-бот с AI-поиском, reasoning, поддержкой файлов, YouTube, приватностью и современным UX.",
    images: [
      "/image/AI.png"
    ]
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/image/AI.png"
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeClient />
        {children}
      </body>
    </html>
  );
}
