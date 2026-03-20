"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  Clock, 
  Beer, 
  Activity,
  Plus,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [stats, setStats] = useState({ 
    bookingsToday: 0, 
    revenue: 0, 
    openOrders: 0,
    freeSlots: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      async function getDashboardData() {
    setLoading(true);
    
    // 1. Receita Real (Somente o que está como 'pago' nos agendamentos)
    const { data: revenueData } = await supabase
      .from('bookings')
      .select('price')
      .eq('payment_status', 'pago');

    const totalRevenue = revenueData?.reduce((acc, b) => acc + Number(b.price || 0), 0) || 0;

    // 2. Receita Pendente (O que ainda falta receber)
    const { data: pendingData } = await supabase
      .from('bookings')
      .select('price')
      .eq('payment_status', 'pendente');

    const pendingRevenue = pendingData?.reduce((acc, b) => acc + Number(b.price || 0), 0) || 0;

    setStats({
      bookingsToday: 0, // Pode manter sua lógica de count aqui
      revenue: totalRevenue,
      openOrders: pendingRevenue, // Usando esse card para mostrar o pendente
      freeSlots: 0
    });
    setLoading(false);
  }

    getDashboardData();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-8">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-slate-400 mt-1">Status real da Futshow agora.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/comandas" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors border border-slate-700">
            <Beer size={18} className="text-[#FFC700]" />
            Abrir Comanda
          </Link>
          <Link href="/agendar" className="flex items-center gap-2 px-4 py-2 bg-[#FFC700] hover:bg-yellow-400 text-black rounded-xl font-bold transition-colors shadow-lg shadow-yellow-500/20">
            <Plus size={18} />
            Novo Agendamento
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Jogos Hoje" value={stats.bookingsToday.toString()} subtitle="Confirmados no sistema" icon={<Activity size={22} className="text-emerald-400" />} />
        <MetricCard title="Receita Total" value={`R$ ${stats.revenue.toFixed(2)}`} subtitle="Comandas pagas" icon={<TrendingUp size={22} className="text-blue-400" />} />
        <MetricCard title="Comandas Abertas" value={stats.openOrders.toString()} subtitle="Consumo em aberto" icon={<Beer size={22} className="text-orange-400" />} />
        <MetricCard title="Vagas Livres" value={stats.freeSlots.toString()} subtitle="Horários disponíveis" icon={<Clock size={22} className="text-purple-400" />} />
      </div>

      {/* Seção Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        
        <div className="lg:col-span-2 bg-[#0F172A] rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Status das Quadras</h2>
            <span className="flex items-center gap-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AO VIVO
            </span>
          </div>

          <div className="space-y-4">
            <CourtStatus name="Quadra 1 (Vôlei)" status="Ocupada" time="18:00 - 19:00" players="João e galera" />
            <CourtStatus name="Quadra 2 (Beach Tennis)" status="Livre" time="Agora" players="--" isFree />
          </div>
        </div>

        <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Últimas Vendas</h2>
            <Link href="/comandas" className="text-sm text-[#FFC700] hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
             <p className="text-xs text-slate-500 text-center py-4">As vendas aparecerão aqui após serem lançadas.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponentes
function MetricCard({ title, value, subtitle, icon }: any) {
  return (
    <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className="p-2 bg-slate-800/50 rounded-lg">{icon}</div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{subtitle}</p>
      </div>
    </div>
  );
}

function CourtStatus({ name, status, time, players, isFree = false }: any) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${isFree ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-800 border-slate-700'}`}>
      <div>
        <h4 className="font-bold text-white text-sm">{name}</h4>
        <p className="text-xs text-slate-400 mt-0.5">{players}</p>
      </div>
      <div className="text-right">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isFree ? 'bg-slate-700 text-slate-300' : 'bg-[#FFC700] text-black'}`}>
          {status}
        </span>
        <p className="text-xs font-medium text-slate-400 mt-1">{time}</p>
      </div>
    </div>
  );
}