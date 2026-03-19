import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Receituário Médico Digital",
  description: "Plataforma clínica web para documentos digitais"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

