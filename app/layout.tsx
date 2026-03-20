import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header"; // Caminho corrigido para a raiz

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Futshow | Gestão de Arena",
  description: "Reserve sua quadra de Beach Tennis, Vôlei e Futevôlei em poucos cliques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-[#0A0F1C] flex flex-col`}>
        {/* Header fixo no topo */}
        <Header />
        
        {/* Main com padding horizontal, igual ao design */}
        <main className="flex-1 w-full p-8 px-10">
          {children}
        </main>
      </body>
    </html>
  );
}