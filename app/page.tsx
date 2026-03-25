"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, Trophy, Receipt, 
  DollarSign, ArrowRight, Loader2, 
  TrendingUp, Activity, Target, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    activeOrders: 0,
    bookingsToday: 0,
    activeTournaments: 0,
    dailyRevenue: 0
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Comandas Ativas
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aberta');

      // 2. Agendamentos de Hoje
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', today)
        .lte('start_time', today + 'T23:59:59');

      // 3. Torneios em Andamento
      const { count: tourneyCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'finalizado');

      // 4. Faturamento do Dia
      const { data: dailySales } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'paga')
        .gte('created_at', today);
      
      const revenue = dailySales?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

      setStats({
        activeOrders: ordersCount || 0,
        bookingsToday: bookingsCount || 0,
        activeTournaments: tourneyCount || 0,
        dailyRevenue: revenue
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-24 px-4 text-white pt-24 md:pt-32">
      
      {/* BOAS VINDAS (ESTILO IMAGE_8C12C2) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800/50 pb-10">
        <div>
          <p className="text-[#FFC700] text-[10px] font-black uppercase tracking-[0.4em] mb-3 italic">Dashboard Principal</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.85]">
            Arena <br /> 
            <span className="text-white">Futshow</span> <br />
            <span className="text-slate-700 italic">Maravilha</span>
          </h1>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl backdrop-blur-md">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Status de Hoje</p>
          <p className="text-xl font-black uppercase italic text-[#FFC700]">
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Caixa */}
        <div className="bg-[#0F172A] border-2 border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform text-emerald-500">
            <TrendingUp size={120} />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Caixa (Hoje)</p>
          <h3 className="text-3xl font-black text-emerald-500 italic">R$ {stats.dailyRevenue.toFixed(2)}</h3>
        </div>

        {/* Comandas */}
        <div onClick={() => router.push('/comandas')} className="bg-[#0F172A] border-2 border-slate-800 p-8 rounded-[40px] shadow-2xl cursor-pointer hover:border-[#FFC700]/50 transition-all relative overflow-hidden group active:scale-95">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform text-[#FFC700]">
            <Receipt size={120} />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Comandas Ativas</p>
          <h3 className="text-3xl font-black text-white italic">{stats.activeOrders} <span className="text-[10px] text-slate-600 uppercase">Abertas</span></h3>
        </div>

        {/* Agendamentos */}
        <div onClick={() => router.push('/agendar')} className="bg-[#0F172A] border-2 border-slate-800 p-8 rounded-[40px] shadow-2xl cursor-pointer hover:border-[#FFC700]/50 transition-all relative overflow-hidden group active:scale-95">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform text-[#FFC700]">
            <Calendar size={120} />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Reservas Hoje</p>
          <h3 className="text-3xl font-black text-white italic">{stats.bookingsToday} <span className="text-[10px] text-slate-600 uppercase">Horários</span></h3>
        </div>

        {/* Torneios */}
        <div onClick={() => router.push('/campeonatos')} className="bg-[#0F172A] border-2 border-slate-800 p-8 rounded-[40px] shadow-2xl cursor-pointer hover:border-[#FFC700]/50 transition-all relative overflow-hidden group active:scale-95">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform text-[#FFC700]">
            <Target size={120} />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Torneios</p>
          <h3 className="text-3xl font-black text-white italic">{stats.activeTournaments} <span className="text-[10px] text-slate-600 uppercase">Ativos</span></h3>
        </div>
      </div>

      {/* SEÇÃO DE ATALHOS / MÓDULOS */}
      <div className="space-y-8 pt-10">
        <div className="flex items-center gap-4 ml-4">
          <div className="h-[2px] w-8 bg-[#FFC700]" />
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-600 italic">Central de Controle</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Reservas */}
          <div onClick={() => router.push('/agendar')} className="bg-slate-900/20 border border-slate-800/50 p-10 rounded-[48px] space-y-6 hover:bg-slate-900/40 transition-all cursor-pointer group">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-[#FFC700] group-hover:bg-[#FFC700] group-hover:text-black transition-all">
              <Calendar size={32} />
            </div>
            <div>
              <h4 className="text-2xl font-black uppercase italic leading-none mb-3">Agenda</h4>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase tracking-wider">Gestão do mapa de quadras em tempo real.</p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-[#FFC700] tracking-widest">
              Abrir Mapa <ChevronRight size={14} />
            </div>
          </div>

          {/* Bar */}
          <div onClick={() => router.push('/comandas')} className="bg-slate-900/20 border border-slate-800/50 p-10 rounded-[48px] space-y-6 hover:bg-slate-900/40 transition-all cursor-pointer group">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-[#FFC700] group-hover:bg-[#FFC700] group-hover:text-black transition-all">
              <Receipt size={32} />
            </div>
            <div>
              <h4 className="text-2xl font-black uppercase italic leading-none mb-3">PDV Bar</h4>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase tracking-wider">Lançamento de consumo e controle de estoque.</p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-[#FFC700] tracking-widest">
              Abrir Caixa <ChevronRight size={14} />
            </div>
          </div>

          {/* Financeiro */}
          <div onClick={() => router.push('/financeiro')} className="bg-slate-900/20 border border-slate-800/50 p-10 rounded-[48px] space-y-6 hover:bg-slate-900/40 transition-all cursor-pointer group">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-[#FFC700] group-hover:bg-[#FFC700] group-hover:text-black transition-all">
              <DollarSign size={32} />
            </div>
            <div>
              <h4 className="text-2xl font-black uppercase italic leading-none mb-3">Balanço</h4>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase tracking-wider">Análise de lucros, despesas e fluxo de caixa.</p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-[#FFC700] tracking-widest">
              Ver Relatórios <ChevronRight size={14} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}