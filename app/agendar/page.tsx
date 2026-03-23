"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, User, X, Check, Loader2, Trash2 
} from "lucide-react";
import { format, addDays, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ConfirmModal from "@/components/ConfirmModal";

const HOURS = Array.from({ length: 17 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const SPORTS = ["Vôlei", "Beach Tennis", "Futevôlei"];

export default function AgendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [courts, setCourts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Estados do Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{courtId: string, hour: string, courtName: string, bookingId?: string} | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [selectedSport, setSelectedSport] = useState("Vôlei");

  // Estado dinâmico para o ConfirmModal (Substitui o isConfirmOpen antigo)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
    onConfirm: () => {},
  });

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

  // --- HANDLERS ---

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

  // --- LÓGICA DE EXCLUSÃO COM TRAVA DE SEGURANÇA ---
  
  const handleDeleteClick = () => {
    const currentBooking = bookings.find(b => b.id === selectedSlot?.bookingId);

    // TRAVA: Se estiver PAGO, mostra aviso amarelo (warning) e remove a função de confirmar
    if (currentBooking?.payment_status === 'pago') {
      setConfirmConfig({
        isOpen: true,
        title: "Cancelamento Bloqueado",
        message: "Este horário já consta como PAGO. Para remover, altere o status para 'pendente' na Lista de Agendamentos primeiro.",
        variant: "warning",
        onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Se estiver pendente, mostra o modal vermelho (danger) para confirmar exclusão
    setConfirmConfig({
      isOpen: true,
      title: "Cancelar Horário",
      message: `Deseja realmente remover o agendamento de "${customerName}"? Esta ação liberará a quadra imediatamente.`,
      variant: "danger",
      onConfirm: handleConfirmDelete
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedSlot?.bookingId) return;
    setIsSaving(true);
    const { error } = await supabase.from('bookings').delete().eq('id', selectedSlot.bookingId);
    if (!error) {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      setIsModalOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      
      {/* HEADER COM SELETOR DE DATA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-5 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700]">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">Cronograma</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic mt-1">Mapa de Ocupação da Arena</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><ChevronLeft size={20}/></button>
          
          <div className="px-6 text-center min-w-[180px] cursor-pointer hover:bg-slate-800 py-1 rounded-xl transition-colors relative" onClick={() => dateInputRef.current?.showPicker()}>
            <input type="date" ref={dateInputRef} className="absolute inset-0 opacity-0 pointer-events-none" onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value + "T12:00:00"))} />
            <span className="block text-sm font-black text-white capitalize">{format(currentDate, "EEEE", { locale: ptBR })}</span>
            <span className="block text-[11px] font-bold text-[#FFC700]">{format(currentDate, "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>

          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* GRADE DO CRONOGRAMA */}
      <div className="bg-[#0F172A] rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="p-5 border-b border-r border-slate-800 bg-slate-900 w-24 text-slate-500"><Clock size={18} className="mx-auto" /></th>
                {courts.map(c => (
                  <th key={c.id} className="p-5 border-b border-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] italic min-w-[220px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {HOURS.map(hour => (
                <tr key={hour} className="group hover:bg-white/[0.01]">
                  <td className="p-5 border-r border-slate-800 text-center text-xs font-black text-slate-500 group-hover:text-[#FFC700] transition-colors italic">{hour}</td>
                  {courts.map(court => {
                    const booking = bookings.find(b => format(parseISO(b.start_time), "HH:00") === hour && b.court_id === court.id);
                    return (
                      <td key={court.id + hour} className="p-2 h-24">
                        {booking ? (
                          <button 
                            onClick={() => handleOpenModal(court.id, hour, court.name, booking)}
                            className="h-full w-full rounded-[20px] p-4 flex flex-col justify-center bg-[#FFC700] text-black shadow-lg text-left hover:scale-[1.02] transition-all animate-in fade-in"
                          >
                            <span className="text-[9px] font-black uppercase opacity-70 leading-none italic">{booking.sport}</span>
                            <span className="text-sm font-black truncate mt-1 uppercase leading-tight italic tracking-tighter">{booking.customer_name}</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleOpenModal(court.id, hour, court.name)}
                            className="h-full w-full rounded-[20px] border-2 border-dashed border-slate-800 hover:border-[#FFC700]/40 hover:bg-[#FFC700]/5 flex items-center justify-center transition-all opacity-20 hover:opacity-100 group/btn"
                          >
                            <Plus size={20} className="text-slate-500 group-hover/btn:text-[#FFC700]" />
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

      {/* MODAL DE GERENCIAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] shadow-2xl border-t-4 border-t-[#FFC700] p-10 animate-in zoom-in duration-200 text-white">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic">
                  {selectedSlot?.bookingId ? 'Editar Reserva' : 'Nova Reserva'}
                </h2>
                <p className="text-[#FFC700] text-[10px] font-black mt-2 uppercase tracking-widest italic">
                  {selectedSlot?.courtName} • {selectedSlot?.hour}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nome do Atleta / Grupo</label>
                <input 
                  autoFocus
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white focus:border-[#FFC700] outline-none font-bold italic" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Modalidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPORTS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSelectedSport(s)} 
                      className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all italic ${
                        selectedSport === s 
                        ? 'bg-[#FFC700] text-black border-[#FFC700]' 
                        : 'bg-slate-900 text-slate-500 border-slate-800'
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
                  className="w-full bg-[#FFC700] text-black font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} />} 
                  Confirmar Agendamento
                </button>

                {selectedSlot?.bookingId && (
                  <button 
                    onClick={handleDeleteClick} 
                    className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] transition-all"
                  >
                    <Trash2 size={16} /> Cancelar Horário
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE DE CONFIRMAÇÃO CENTRALIZADO */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        isLoading={isSaving}
      />
    </div>
  );
}