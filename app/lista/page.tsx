"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Calendar as CalendarIcon, Clock, 
  CheckCircle2, AlertCircle, DollarSign, ListFilter 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ListaAgendamentosPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .order('start_time', { ascending: false });
    if (data) setBookings(data);
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Função para alternar o status de pagamento
  const togglePayment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: newStatus })
      .eq('id', id);

    if (!error) loadBookings();
  };

  const filtered = bookings.filter(b => 
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.courts?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4">
      
      {/* HEADER DA LISTA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-5 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner">
            <ListFilter size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">Lista de Agendamento</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Visão Geral dos Horários</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar por cliente ou quadra..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 text-sm text-white focus:border-[#FFC700] outline-none transition-all" 
          />
        </div>
      </div>

      {/* TABELA DE AGENDAMENTOS GRUPADOS */}
      <div className="bg-[#0F172A] rounded-[32px] border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente / Modalidade</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Quadra / Período</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Financeiro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.length > 0 ? filtered.map(b => (
              <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-6">
                  <div className="font-bold text-white text-sm uppercase leading-tight">{b.customer_name}</div>
                  <div className="text-[10px] text-[#FFC700] font-black uppercase mt-1 tracking-wider italic">
                    {b.sport}
                  </div>
                </td>
                
                <td className="p-6">
                  {/* Visual seguindo sua imagem: Hora Grande + Detalhes abaixo */}
                  <div className="flex items-center gap-2 text-white font-black text-lg">
                    <Clock size={16} className="text-[#FFC700]" />
                    {format(parseISO(b.start_time), "HH:mm")}
                    <span className="text-slate-600 font-medium">às</span>
                    {b.end_time ? format(parseISO(b.end_time), "HH:mm") : '--:--'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-tight">
                    {b.courts?.name} • {format(parseISO(b.start_time), "dd/MM", { locale: ptBR })}
                  </div>
                </td>

                <td className="p-6 text-center">
                  <button 
                    onClick={() => togglePayment(b.id, b.payment_status)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border w-full max-w-[140px] justify-center ${
                      b.payment_status === 'pago'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                      : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-lg shadow-red-500/5'
                    }`}
                  >
                    {b.payment_status === 'pago' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {b.payment_status || 'pendente'}
                  </button>
                  <div className="text-[10px] text-slate-600 font-bold mt-2 italic">
                    Valor: R$ {Number(b.price || 0).toFixed(2)}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}