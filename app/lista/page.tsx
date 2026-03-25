"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Clock, CheckCircle2, AlertCircle, ListFilter, Loader2, Calendar 
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
    const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: newStatus })
      .eq('id', id);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, payment_status: newStatus } : b));
    }
  };

  const filtered = bookings.filter(b => 
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.courts?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    /* pt-24 para mobile e pt-32 para desktop para alinhar com o Header fixo */
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER E BUSCA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner">
            <ListFilter size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter italic leading-none">Agendamentos</h1>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic mt-1">Gestão de Recebimentos</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar cliente ou quadra..." 
            className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-[#FFC700] outline-none transition-all font-bold italic" 
          />
        </div>
      </div>

      {/* VERSÃO DESKTOP: TABELA (Oculta no Mobile) */}
      <div className="hidden md:block bg-[#0F172A] rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl">
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
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 w-full max-w-[180px] justify-center active:scale-95 ${
                      b.payment_status === 'pago'
                      ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-transparent text-red-500 border-red-500/30 hover:border-red-500 shadow-lg'
                    }`}
                  >
                    {b.payment_status === 'pago' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {b.payment_status === 'pago' ? 'PAGO' : 'PENDENTE'}
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

      {/* VERSÃO MOBILE: LISTA DE CARDS (Oculta no Desktop) */}
      <div className="md:hidden space-y-3">
        {filtered.map(b => (
          <div key={b.id} className="bg-[#0F172A] border border-slate-800 rounded-[24px] p-5 shadow-lg active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-black text-white text-lg uppercase italic tracking-tighter leading-none">{b.customer_name}</div>
                <div className="text-[9px] text-[#FFC700] font-black uppercase mt-1.5 italic tracking-wider">{b.sport}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-white text-base italic leading-none">R$ {Number(b.price || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-5 p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="flex flex-col items-center border-r border-slate-700 pr-4">
                <span className="text-[14px] font-black text-white leading-none">{format(parseISO(b.start_time), "HH:mm")}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Início</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase italic">
                  <Calendar size={12} className="text-[#FFC700]" />
                  {format(parseISO(b.start_time), "dd 'de' MMM", { locale: ptBR })}
                </div>
                <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{b.courts?.name}</div>
              </div>
            </div>

            <button 
              onClick={() => togglePayment(b.id, b.payment_status)}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                b.payment_status === 'pago'
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}
            >
              {b.payment_status === 'pago' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {b.payment_status === 'pago' ? 'PAGO' : 'PENDENTE'}
            </button>
          </div>
        ))}
      </div>

      {/* FOOTER MENSAGEM */}
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-[#0F172A] rounded-[40px] border border-slate-800 border-dashed">
          <p className="text-slate-500 font-bold uppercase italic tracking-widest text-xs">Nenhum agendamento encontrado</p>
        </div>
      )}
    </div>
  );
}