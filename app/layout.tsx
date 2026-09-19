import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Atkinson_Hyperlegible } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ReadabilityModeProvider } from "@/shared/hooks/useReadabilityMode";
import ReadabilityToggle from "@/shared/ui/ReadabilityToggle";
import { AosInitializer } from "@/shared/ui/AosInitializer";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

// Atkinson Hyperlegible is a free, open font designed by the Braille
// Institute specifically to maximize legibility and letter distinction —
// a strong, well-supported choice for dyslexia/low-vision friendly reading.
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-readability",
});

export const metadata: Metadata = {
  title: "WicQuiz — Wicaksana Quiz",
  description:
    "Host fun, interactive pub quizzes for your team meetings. Real-time scoring, horse race leaderboards, and six question types.",
  icons: { icon: "/ikon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-bg-theme="soft"
      className={`${plusJakarta.variable} ${atkinsonHyperlegible.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AosInitializer />
        <ReadabilityModeProvider>
          {children}
          <ReadabilityToggle />
        </ReadabilityModeProvider>
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: "var(--font-plus-jakarta), sans-serif" },
          }}
        />
      </body>
    </html>
  );
}
