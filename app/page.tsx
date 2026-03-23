"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Home, Calendar, Trophy, Package, Receipt, 
  DollarSign, ArrowRight, Loader2, Users, 
  Clock, TrendingUp, Star
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Estados para os resumos rápidos
  const [stats, setStats] = useState({
    activeOrders: 0,
    bookingsToday: 0,
    activeTournaments: 0,
    dailyRevenue: 0
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

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

    // 4. Faturamento do Dia (Vendas pagas hoje)
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
    
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-10 pb-20 px-4 text-white">
      
      {/* BOAS VINDAS E DATA */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p className="text-[#FFC700] text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic">Dashboard Principal</p>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
            Arena Futshow <span className="text-slate-700">|</span> <span className="text-slate-400">Maravilha</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Status de Hoje</p>
          <p className="text-lg font-black uppercase italic text-white mt-1">
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Receita do Dia */}
        <div className="bg-[#0F172A] border border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={60} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Caixa (Hoje)</p>
          <h3 className="text-3xl font-black text-emerald-500 italic">R$ {stats.dailyRevenue.toFixed(2)}</h3>
        </div>

        {/* Comandas */}
        <div onClick={() => router.push('/comandas')} className="bg-[#0F172A] border border-slate-800 p-8 rounded-[40px] shadow-2xl cursor-pointer hover:border-[#FFC700]/50 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Receipt size={60} className="text-[#FFC700]" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Comandas Ativas</p>
          <h3 className="text-3xl font-black text-white italic">{stats.activeOrders} <span className="text-xs text-slate-600">contas</span></h3>
        </div>

        {/* Agendamentos */}
        <div onClick={() => router.push('/agendar')} className="bg-[#0F172A] border border-slate-800 p-8 rounded-[40px] shadow-2xl cursor-pointer hover:border-[#FFC700]/50 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Calendar size={60} className="text-[#FFC700]" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Reservas Hoje</p>
          <h3 className="text-3xl font-black text-white italic">{stats.bookingsToday} <span className="text-xs text-slate-600">horários</span></h3>
        </div>

        {/* Torneios */}
        <div onClick={() => router.push('/campeonatos')} className="bg-[#0F172A] border border-slate-800 p-8 rounded-[40px] shadow-2xl cursor-pointer hover:border-[#FFC700]/50 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy size={60} className="text-[#FFC700]" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Torneios Ativos</p>
          <h3 className="text-3xl font-black text-white italic">{stats.activeTournaments} <span className="text-xs text-slate-600">em curso</span></h3>
        </div>

      </div>

      {/* GUIA DO SISTEMA / ATALHOS RÁPIDOS */}
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-600 ml-4 italic">Guia de Gestão</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Módulo 1 */}
          <div className="bg-slate-900/30 border border-slate-800/50 p-10 rounded-[48px] space-y-6">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-[#FFC700]">
              <Calendar size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase italic leading-none mb-3">Reservas</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed uppercase">Controle o mapa de ocupação das quadras de vôlei, beach tennis e futevôlei.</p>
            </div>
            <button onClick={() => router.push('/agendar')} className="flex items-center gap-2 text-[10px] font-black uppercase text-[#FFC700] hover:gap-4 transition-all">
              Acessar Mapa <ArrowRight size={14} />
            </button>
          </div>

          {/* Módulo 2 */}
          <div className="bg-slate-900/30 border border-slate-800/50 p-10 rounded-[48px] space-y-6">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-[#FFC700]">
              <Receipt size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase italic leading-none mb-3">Vendas & Bar</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed uppercase">Gerencie o consumo dos atletas, abra comandas e controle o estoque em tempo real.</p>
            </div>
            <button onClick={() => router.push('/comandas')} className="flex items-center gap-2 text-[10px] font-black uppercase text-[#FFC700] hover:gap-4 transition-all">
              Abrir PDV <ArrowRight size={14} />
            </button>
          </div>

          {/* Módulo 3 */}
          <div className="bg-slate-900/30 border border-slate-800/50 p-10 rounded-[48px] space-y-6">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-[#FFC700]">
              <DollarSign size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase italic leading-none mb-3">Financeiro</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed uppercase">Visualize o lucro líquido, controle despesas mensais e analise o faturamento bruto.</p>
            </div>
            <button onClick={() => router.push('/financeiro')} className="flex items-center gap-2 text-[10px] font-black uppercase text-[#FFC700] hover:gap-4 transition-all">
              Ver Fluxo <ArrowRight size={14} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}