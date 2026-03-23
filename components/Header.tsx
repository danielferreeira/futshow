"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Home, 
  Calendar, 
  ClipboardList, 
  Trophy, 
  Package, 
  Ticket, 
  CircleDollarSign,
  LogOut,
  Loader2
} from "lucide-react";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (pathname === "/login") return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = "/login"; 
    } catch (error) {
      console.error("Erro ao sair:", error);
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { name: "Home", href: "/", icon: <Home size={18} /> },
    { name: "Agendar", href: "/agendar", icon: <Calendar size={18} /> },
    { name: "Lista de agendamentos", href: "/lista", icon: <ClipboardList size={18} /> },
    { name: "Campeonatos", href: "/campeonatos", icon: <Trophy size={18} /> },
    { name: "Estoque", href: "/estoque", icon: <Package size={18} /> },
    { name: "Comandas", href: "/comandas", icon: <Ticket size={18} /> },
    { name: "Financeiro", href: "/financeiro", icon: <CircleDollarSign size={18} /> },
  ];

  return (
    <nav className="w-full bg-[#0B1120] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      
      {/* LOGO FS */}
      <div className="flex items-center">
        <div className="bg-[#FFC700] w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-lg shadow-lg shadow-yellow-500/10">
          FS
        </div>
      </div>

      {/* LINKS CENTRAIS */}
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive 
                ? "bg-[#FFC700] text-black shadow-lg shadow-yellow-500/10" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* ÁREA DO ADMINISTRADOR - LINK RESTAURADO */}
      <div className="flex items-center gap-6">
        <Link 
          href="/admin" 
          className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-all"
        >
          <div className="text-right">
            <p className="text-sm font-black text-white leading-none group-hover:text-[#FFC700] transition-colors uppercase italic">
              Administrador
            </p>
            <p className="text-[10px] font-bold text-[#FFC700] uppercase tracking-widest mt-1">
              Configurações
            </p>
          </div>
          <div className="w-10 h-10 bg-[#FFC700] rounded-full flex items-center justify-center text-black font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
            A
          </div>
        </Link>

        {/* BOTÃO SAIR */}
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-all text-xs font-bold active:scale-95 disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>Sair <LogOut size={16} /></>
          )}
        </button>
      </div>
    </nav>
  );
}