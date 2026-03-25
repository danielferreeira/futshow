"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Home, Calendar, ClipboardList, Trophy, 
  Package, Ticket, CircleDollarSign, LogOut, 
  Loader2, Settings, Menu, X 
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fecha o menu lateral automaticamente ao mudar de página
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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
    { name: "Home", href: "/", icon: <Home size={20} /> },
    { name: "Agendar", href: "/agendar", icon: <Calendar size={20} /> },
    { name: "Lista de agendamentos", href: "/lista", icon: <ClipboardList size={20} /> },
    //{ name: "Campeonatos", href: "/campeonatos", icon: <Trophy size={20} /> },
    { name: "Estoque", href: "/estoque", icon: <Package size={20} /> },
    { name: "Comandas", href: "/comandas", icon: <Ticket size={20} /> },
    { name: "Financeiro", href: "/financeiro", icon: <CircleDollarSign size={20} /> },
  ];

  return (
    <>
      {/* HEADER PRINCIPAL - FIXO EM TUDO */}
      <nav className="fixed top-0 left-0 right-0 z-[100] w-full bg-[#0B1120] border-b border-slate-800 px-4 md:px-6 py-4 flex items-center justify-between shadow-2xl">
        
        <div className="flex items-center gap-4">
          {/* BOTÃO HAMBÚRGUER (APENAS MOBILE) */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-white p-1 hover:text-[#FFC700] transition-colors"
          >
            <Menu size={28} />
          </button>

          {/* LOGO FS */}
          <Link href="/" className="bg-[#FFC700] w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-black font-black text-base md:text-lg shadow-lg">
            FS
          </Link>
        </div>

        {/* LINKS CENTRAIS (DESKTOP) */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === item.href 
                ? "bg-[#FFC700] text-black shadow-lg" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {item.icon} {item.name}
            </Link>
          ))}
        </div>

        {/* ADMIN E LOGOUT */}
        <div className="flex items-center gap-3">
          <Link href="/admin" title="Configurações">
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-black font-black transition-all active:scale-90 ${pathname === '/admin' ? 'bg-white ring-2 ring-[#FFC700]' : 'bg-[#FFC700]'}`}>
              {pathname === '/admin' ? <Settings size={18} /> : 'A'}
            </div>
          </Link>
          <button 
            onClick={handleLogout} 
            disabled={isLoggingOut}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={20} />}
          </button>
        </div>
      </nav>

      {/* --- MENU LATERAL (SIDEBAR DRAWER) --- */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside 
        className={`fixed top-0 left-0 h-full w-[280px] bg-[#0B1120] border-r border-slate-800 z-[120] transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Topo do Menu */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFC700] w-8 h-8 rounded-full flex items-center justify-center text-black font-black text-sm">FS</div>
              <span className="text-white font-black uppercase italic tracking-tighter text-lg">Futshow</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Links da Sidebar */}
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 no-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                    isActive 
                    ? "bg-[#FFC700] text-black shadow-lg" 
                    : "text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <span className={isActive ? "text-black" : "text-[#FFC700]"}>{item.icon}</span>
                  <span className="uppercase text-[11px] tracking-widest">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Link Admin na Sidebar */}
          <div className="mt-auto pt-4 border-t border-slate-800">
            <Link 
              href="/admin" 
              className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                pathname === '/admin' ? "bg-white text-black" : "text-slate-400"
              }`}
            >
              <Settings size={20} className="text-[#FFC700]" />
              <span className="uppercase text-[11px] tracking-widest">Painel Admin</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}