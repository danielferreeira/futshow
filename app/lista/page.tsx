"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Clock, CheckCircle2, AlertCircle, ListFilter, Loader2 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ListaAgendamentosPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .order('start_time', { ascending: false });
    if (data) setBookings(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const togglePayment = async (id: string, currentStatus: string) => {
    // Alterna entre pago e pendente
    const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
    
    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: newStatus })
      .eq('id', id);

    if (!error) {
      // Atualiza apenas o item na lista local para ser instantâneo
      setBookings(prev => prev.map(b => b.id === id ? { ...b, payment_status: newStatus } : b));
    }
  };

  const filtered = bookings.filter(b => 
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.courts?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner"><ListFilter size={24} /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Lista de Agendamentos</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Controle de Pagamentos</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar cliente ou quadra..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-12 text-sm text-white focus:border-[#FFC700] outline-none transition-all font-bold" 
          />
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-[#0F172A] rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-800">
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Atleta / Modalidade</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Horário / Quadra</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-center">Status de Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(b => (
              <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-6">
                  <div className="font-black text-white text-base uppercase italic tracking-tighter">{b.customer_name}</div>
                  <div className="text-[10px] text-[#FFC700] font-black uppercase mt-1 italic opacity-80">{b.sport}</div>
                </td>
                
                <td className="p-6">
                  <div className="flex items-center gap-2 text-white font-black text-lg italic">
                    <Clock size={16} className="text-slate-600" />
                    {format(parseISO(b.start_time), "HH:mm")}
                    <span className="text-slate-600 text-sm font-bold">HRS</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-black italic">
                    {b.courts?.name} • {format(parseISO(b.start_time), "dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </td>

                <td className="p-6 text-center">
                  <button 
                    onClick={() => togglePayment(b.id, b.payment_status)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 w-full max-w-[160px] justify-center ${
                      b.payment_status === 'pago'
                      ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-transparent text-red-500 border-red-500/30 hover:border-red-500 shadow-lg'
                    }`}
                  >
                    {b.payment_status === 'pago' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {b.payment_status === 'pago' ? 'PAGAMENTO OK' : 'PENDENTE'}
                  </button>
                  <div className="text-[11px] text-white font-black mt-2 italic tracking-widest">
                    R$ {Number(b.price || 0).toFixed(2)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}