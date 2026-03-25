"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, X, Check, Loader2, Trash2 
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

  const [activeCourtTab, setActiveCourtTab] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{courtId: string, hour: string, courtName: string, bookingId?: string} | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [selectedSport, setSelectedSport] = useState("Vôlei");

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
      if (courtsData) {
        setCourts(courtsData);
        if (!activeCourtTab && courtsData.length > 0) {
          setActiveCourtTab(courtsData[0].id);
        }
      }

      const start = startOfDay(currentDate).toISOString();
      const end = endOfDay(currentDate).toISOString();
      const { data: bookingsData } = await supabase.from('bookings').select('*').gte('start_time', start).lte('start_time', end).neq('status', 'cancelado');
      setBookings(bookingsData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentDate, activeCourtTab]);

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

  const handleDeleteClick = () => {
    const currentBooking = bookings.find(b => b.id === selectedSlot?.bookingId);
    if (currentBooking?.payment_status === 'pago') {
      setConfirmConfig({
        isOpen: true,
        title: "Cancelamento Bloqueado",
        message: "Este horário já consta como PAGO. Altere o status para 'pendente' primeiro.",
        variant: "warning",
        onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Cancelar Horário",
      message: `Remover agendamento de "${customerName}"?`,
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
    /* AJUSTE DE ESPAÇAMENTO: pt-24 no mobile e pt-32 no desktop para alinhar com o Header fixo */
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER E DATA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-5 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 md:p-3 bg-slate-800 rounded-xl md:rounded-2xl text-[#FFC700]">
            <CalendarIcon size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase italic leading-none">Cronograma</h1>
            <p className="text-slate-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Arena Futshow</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 md:p-2 rounded-2xl border border-slate-800 w-full md:w-auto justify-between md:justify-start">
          <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
          
          <div className="px-4 text-center cursor-pointer relative" onClick={() => dateInputRef.current?.showPicker()}>
            <input type="date" ref={dateInputRef} className="absolute inset-0 opacity-0 pointer-events-none" onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value + "T12:00:00"))} />
            <span className="block text-xs font-black text-white capitalize">{format(currentDate, "EEEE", { locale: ptBR })}</span>
            <span className="block text-[10px] font-bold text-[#FFC700]">{format(currentDate, "dd 'de' MMM", { locale: ptBR })}</span>
          </div>

          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* SELETOR DE QUADRAS (EXCLUSIVO MOBILE) */}
      <div className="md:hidden flex overflow-x-auto gap-2 pb-2 no-scrollbar">
        {courts.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCourtTab(c.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border ${
              activeCourtTab === c.id 
              ? "bg-[#FFC700] text-black border-[#FFC700]" 
              : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* GRADE DO CRONOGRAMA */}
      <div className="bg-[#0F172A] rounded-[24px] md:rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="p-3 md:p-5 border-b border-r border-slate-800 bg-slate-900 w-16 md:w-24 text-slate-500">
                  <Clock size={16} className="mx-auto" />
                </th>
                {courts.map(c => (
                  <th 
                    key={c.id} 
                    className={`p-3 md:p-5 border-b border-slate-800 text-white font-black text-[10px] md:text-xs uppercase italic min-w-[160px] md:min-w-[220px] 
                    ${activeCourtTab !== c.id ? "hidden md:table-cell" : "table-cell"}`}
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {HOURS.map(hour => (
                <tr key={hour} className="group">
                  <td className="p-3 md:p-5 border-r border-slate-800 text-center text-[10px] md:text-xs font-black text-slate-500 italic">{hour}</td>
                  {courts.map(court => {
                    const booking = bookings.find(b => format(parseISO(b.start_time), "HH:00") === hour && b.court_id === court.id);
                    return (
                      <td 
                        key={court.id + hour} 
                        className={`p-1.5 md:p-2 h-20 md:h-24 ${activeCourtTab !== court.id ? "hidden md:table-cell" : "table-cell"}`}
                      >
                        {booking ? (
                          <button 
                            onClick={() => handleOpenModal(court.id, hour, court.name, booking)}
                            className="h-full w-full rounded-[16px] md:rounded-[20px] p-2 md:p-4 flex flex-col justify-center bg-[#FFC700] text-black shadow-lg text-left transition-all active:scale-95"
                          >
                            <span className="text-[8px] font-black uppercase opacity-70 italic">{booking.sport}</span>
                            <span className="text-xs md:text-sm font-black truncate uppercase leading-tight italic tracking-tighter">{booking.customer_name}</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleOpenModal(court.id, hour, court.name)}
                            className="h-full w-full rounded-[16px] md:rounded-[20px] border-2 border-dashed border-slate-800 flex items-center justify-center transition-all opacity-30 active:opacity-100"
                          >
                            <Plus size={18} className="text-slate-500" />
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

      {/* MODAL DE GERENCIAMENTO*/}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          
          <div className="bg-[#0F172A] w-full max-w-md rounded-[48px] border-2 border-slate-800 border-t-[#FFC700] border-t-4 shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in duration-300 text-white relative">
            
            {/* HEADER DO MODAL */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                  Nova Reserva
                </h2>
                <p className="text-[#FFC700] text-[10px] font-black mt-2 uppercase tracking-[0.3em] italic">
                  {selectedSlot?.courtName} • {selectedSlot?.hour}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={28} />
              </button>
            </div>
            
            <div className="space-y-8">
              {/* INPUT ATLETA */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">
                  Nome do Atleta / Grupo
                </label>
                <input 
                  autoFocus
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  className="w-full bg-[#0B1120] border-2 border-[#FFC700] rounded-3xl py-5 px-6 text-white outline-none font-bold italic text-sm shadow-inner shadow-yellow-500/5" 
                />
              </div>

              {/* SELEÇÃO DE MODALIDADE */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">
                  Modalidade
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SPORTS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSelectedSport(s)} 
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all italic ${
                        selectedSport === s 
                        ? 'bg-[#FFC700] text-black border-[#FFC700] shadow-lg shadow-yellow-500/20' 
                        : 'bg-[#0B1120] text-slate-500 border-slate-800 hover:border-slate-700'
                      } ${s === 'Futevôlei' ? 'col-span-2' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* BOTÃO SALVAR */}
              <div className="pt-4">
                <button 
                  onClick={handleSave} 
                  disabled={!customerName || isSaving}
                  className="w-full bg-[#FFC700] text-black font-black py-6 rounded-3xl shadow-2xl shadow-yellow-500/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={4} />} 
                  Confirmar Agendamento
                </button>

                {selectedSlot?.bookingId && (
                  <button 
                    onClick={handleDeleteClick} 
                    className="w-full text-red-500 font-bold py-4 text-[9px] uppercase tracking-[0.3em] mt-4 hover:underline"
                  >
                    Excluir Reserva
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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