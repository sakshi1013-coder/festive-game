import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "BappaVerse — Ganapati Festival Gaming Platform",
  description:
    "Celebrate Ganapati with exciting quizzes and live Housie games. Experience the joy of the festival with BappaVerse.",
  keywords: "Ganesh Chaturthi, Ganapati, Housie, Tambola, Quiz, Festival, Games",
  openGraph: {
    title: "BappaVerse — Ganapati Festival Gaming Platform",
    description: "Celebrate. Play. Win.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-bappa-text antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
