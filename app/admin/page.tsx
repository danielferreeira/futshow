"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Settings, Plus, Trash2, Edit, Loader2, Check, X, 
  MapPin, DollarSign, LayoutDashboard 
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal"; 

export default function AdminPage() {
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCourt, setCurrentCourt] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<{id: string, name: string} | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);

  const loadCourts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('courts').select('*').order('name');
    if (data) setCourts(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadCourts(); }, [loadCourts]);

  const handleOpenEditModal = (court: any) => {
    setCurrentCourt(court);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setCurrentCourt(null);
    setIsModalOpen(false);
  };

  const handleRequestDelete = (id: string, name: string) => {
    setCourtToDelete({ id, name });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!courtToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.from('courts').delete().eq('id', courtToDelete.id);

    if (error) {
      alert("Erro ao remover: " + error.message);
    } else {
      await loadCourts();
      setIsConfirmOpen(false);
      setCourtToDelete(null);
    }
    setIsSaving(false);
  };

  const handleSaveCourt = async () => {
    if (!nameRef.current || !rateRef.current) return;
    
    const updatedCourt = {
      name: nameRef.current.value,
      hourly_rate: parseFloat(rateRef.current.value),
    };

    setIsSaving(true);
    
    let error;
    if (currentCourt) {
      const { error: err } = await supabase.from('courts').update(updatedCourt).eq('id', currentCourt.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('courts').insert({ ...updatedCourt, is_active: true });
      error = err;
    }

    if (!error) {
      await loadCourts();
      handleCloseModal();
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    /* pt-24 para mobile e pt-32 para desktop para alinhar com o Header fixo */
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase italic leading-none tracking-tighter">Ajustes da Arena</h1>
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest italic mt-1.5">
              Gestão de Quadras e Valores
            </p>
          </div>
        </div>

        <button 
          onClick={() => handleOpenEditModal(null)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#FFC700] hover:bg-yellow-400 text-black px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/10 transition-all active:scale-95"
        >
          <Plus size={16} /> Adicionar Quadra
        </button>
      </div>

      {/* GRADE DE QUADRAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {courts.map(court => (
          <div key={court.id} className="bg-[#0F172A] border border-slate-800 rounded-[32px] md:rounded-[40px] p-6 md:p-8 space-y-6 shadow-2xl relative group hover:border-[#FFC700]/30 transition-all">
            
            <div className="absolute top-6 right-6 flex items-center gap-1">
              <button 
                onClick={() => handleOpenEditModal(court)}
                className="p-2 text-slate-600 hover:text-[#FFC700] transition-colors"
              >
                <Edit size={18} />
              </button>
              <button 
                onClick={() => handleRequestDelete(court.id, court.name)}
                className="p-2 text-slate-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl text-slate-500">
                  <LayoutDashboard size={20} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter truncate pr-16">{court.name}</h3>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-slate-800 pt-5">
                <div className="flex justify-between items-center p-3 bg-[#0B1120] rounded-2xl border border-slate-800/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Preço / Hora</span>
                  <span className="text-lg font-black text-emerald-500 italic">R$ {court.hourly_rate?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#0B1120] rounded-2xl border border-slate-800/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Status</span>
                  <span className="text-[9px] font-black text-[#FFC700] uppercase italic bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">Ativa</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE EDIÇÃO (DESIGN PREMIUM FS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border-2 border-slate-800 border-t-[#FFC700] border-t-4 w-full max-w-md rounded-[48px] p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300 text-white relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
                  {currentCourt ? 'Editar' : 'Nova'} Quadra
                </h2>
                <p className="text-[#FFC700] text-[9px] font-black mt-2 uppercase tracking-[0.2em] italic">Configuração do Espaço</p>
              </div>
              <button onClick={handleCloseModal} className="bg-slate-800/50 p-2 rounded-full text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Nome da Quadra / Identificação</label>
                <input 
                  autoFocus
                  type="text" 
                  ref={nameRef}
                  defaultValue={currentCourt?.name || ""}
                  placeholder="Ex: Quadra Central"
                  className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-3xl py-4 px-6 font-bold italic text-sm focus:border-[#FFC700] outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Valor da Hora (R$)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#FFC700]" />
                  <input 
                    type="number" 
                    ref={rateRef}
                    defaultValue={currentCourt?.hourly_rate || ""}
                    placeholder="80.00"
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-3xl py-4 pl-12 pr-6 font-bold italic text-sm focus:border-[#FFC700] outline-none transition-all text-emerald-500" 
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveCourt} 
                disabled={isSaving}
                className="w-full bg-[#FFC700] text-black font-black py-5 rounded-3xl uppercase tracking-widest text-[11px] shadow-lg shadow-yellow-500/10 active:scale-95 transition-all mt-2"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Salvar Configuração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE CONFIRMMODAL INTEGRADO */}
      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remover Quadra?"
        message={`Confirma a exclusão da "${courtToDelete?.name}"? Agendamentos vinculados a ela podem apresentar erro.`}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        isLoading={isSaving}
        variant="danger"
      />
    </div>
  );
}