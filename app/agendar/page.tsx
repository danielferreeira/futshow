"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, User, X, Check, Loader2, Trash2 
} from "lucide-react";
import { format, addDays, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const HOURS = Array.from({ length: 17 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const SPORTS = ["Vôlei", "Beach Tennis", "Futevôlei"];

export default function AgendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [courts, setCourts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{courtId: string, hour: string, courtName: string, bookingId?: string} | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [selectedSport, setSelectedSport] = useState("Vôlei");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: courtsData } = await supabase.from('courts').select('*').eq('is_active', true).order('name');
      if (courtsData) setCourts(courtsData);

      const start = startOfDay(currentDate).toISOString();
      const end = endOfDay(currentDate).toISOString();
      const { data: bookingsData } = await supabase.from('bookings').select('*').gte('start_time', start).lte('start_time', end).neq('status', 'cancelado');
      setBookings(bookingsData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenModal = (courtId: string, hour: string, courtName: string, existingBooking?: any) => {
    if (existingBooking) {
      setSelectedSlot({ courtId, hour, courtName, bookingId: existingBooking.id });
      setCustomerName(existingBooking.customer_name);
      setSelectedSport(existingBooking.sport);
    } else {
      setSelectedSlot({ courtId, hour, courtName });
      setCustomerName("");
      setSelectedSport("Vôlei");
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!customerName || !selectedSlot) return;
    setIsSaving(true);

    const courtData = courts.find(c => c.id === selectedSlot.courtId);
    const hourlyRate = courtData?.hourly_rate || 0;

    const dataPayload: any = {
      customer_name: customerName,
      sport: selectedSport,
      price: hourlyRate,
    };

    let error;
    if (selectedSlot.bookingId) {
      const { error: err } = await supabase.from('bookings').update(dataPayload).eq('id', selectedSlot.bookingId);
      error = err;
    } else {
      const [h, m] = selectedSlot.hour.split(':');
      const start = new Date(currentDate);
      start.setHours(parseInt(h), parseInt(m), 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      const { error: err } = await supabase.from('bookings').insert({
        ...dataPayload,
        court_id: selectedSlot.courtId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmado'
      });
      error = err;
    }

    if (!error) {
      setIsModalOpen(false);
      fetchData();
    } else {
      alert(error.message);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedSlot?.bookingId) return;
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    setIsSaving(true);
    const { error } = await supabase.from('bookings').delete().eq('id', selectedSlot.bookingId);
    if (!error) {
      setIsModalOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4">
      
      {/* HEADER COM SELETOR DE DATA INTEGRADO */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-5 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700]"><CalendarIcon size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Cronograma</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Mapa de Ocupação</p>
          </div>
        </div>

        {/* CONTROLE DE DATA */}
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <button 
            onClick={() => setCurrentDate(subDays(currentDate, 1))}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <ChevronLeft size={20}/>
          </button>
          
          {/* Input de Data Escondido, mas funcional */}
          <div 
            className="px-6 text-center min-w-[180px] cursor-pointer hover:bg-slate-800 py-1 rounded-xl transition-colors relative"
            onClick={() => dateInputRef.current?.showPicker()}
          >
            <input 
              type="date" 
              ref={dateInputRef}
              className="absolute inset-0 opacity-0 pointer-events-none"
              onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value + "T12:00:00"))}
            />
            <span className="block text-sm font-black text-white capitalize">
              {format(currentDate, "EEEE", { locale: ptBR })}
            </span>
            <span className="block text-[11px] font-bold text-[#FFC700]">
              {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <button 
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <ChevronRight size={20}/>
          </button>
        </div>
      </div>

      {/* GRADE DO CRONOGRAMA */}
      <div className="bg-[#0F172A] rounded-[32px] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="p-5 border-b border-r border-slate-800 bg-slate-900 w-24 text-slate-500"><Clock size={18} className="mx-auto" /></th>
                {courts.map(c => (
                  <th key={c.id} className="p-5 border-b border-slate-800 text-white font-black text-xs uppercase tracking-widest min-w-[220px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {HOURS.map(hour => (
                <tr key={hour} className="group hover:bg-white/[0.01]">
                  <td className="p-5 border-r border-slate-800 text-center text-xs font-black text-slate-500 group-hover:text-[#FFC700] transition-colors">{hour}</td>
                  {courts.map(court => {
                    const booking = bookings.find(b => format(parseISO(b.start_time), "HH:00") === hour && b.court_id === court.id);
                    return (
                      <td key={court.id + hour} className="p-2 h-24">
                        {booking ? (
                          <button 
                            onClick={() => handleOpenModal(court.id, hour, court.name, booking)}
                            className="h-full w-full rounded-2xl p-3 flex flex-col justify-center bg-[#FFC700] text-black shadow-lg text-left hover:scale-[1.02] transition-transform animate-in fade-in duration-300"
                          >
                            <span className="text-[9px] font-black uppercase opacity-60 leading-none">{booking.sport}</span>
                            <span className="text-sm font-black truncate mt-1 uppercase leading-tight">{booking.customer_name}</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleOpenModal(court.id, hour, court.name)}
                            className="h-full w-full rounded-2xl border-2 border-dashed border-slate-800 hover:border-[#FFC700]/30 hover:bg-[#FFC700]/5 flex items-center justify-center transition-all opacity-20 hover:opacity-100 group/btn"
                          >
                            <Plus size={20} className="text-slate-700 group-hover/btn:text-[#FFC700]" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO (Cadastro / Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] shadow-2xl border-t-4 border-t-[#FFC700] p-10 animate-in zoom-in duration-200 text-white">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic">
                  {selectedSlot?.bookingId ? 'Gerenciar' : 'Reservar'}
                </h2>
                <p className="text-[#FFC700] text-xs font-bold mt-2 uppercase tracking-widest">
                  {selectedSlot?.courtName} • {selectedSlot?.hour}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2 text-white">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Atleta</label>
                <input 
                  autoFocus
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  placeholder="Ex: João Silva"
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white focus:border-[#FFC700] outline-none font-bold" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modalidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPORTS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSelectedSport(s)} 
                      className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                        selectedSport === s 
                        ? 'bg-[#FFC700] text-black border-[#FFC700]' 
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleSave} 
                  disabled={!customerName || isSaving}
                  className="w-full bg-[#FFC700] hover:bg-yellow-400 disabled:opacity-50 text-black font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} />} 
                  {selectedSlot?.bookingId ? 'Salvar Alterações' : 'Confirmar Reserva'}
                </button>

                {selectedSlot?.bookingId && (
                  <button 
                    onClick={handleDelete} 
                    disabled={isSaving}
                    className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] transition-all"
                  >
                    <Trash2 size={16} /> Excluir Reserva
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}