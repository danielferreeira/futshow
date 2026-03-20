"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Settings, LayoutGrid, Plus, 
  Trash2, Edit, Loader2, Check, AlertCircle, X
} from "lucide-react";

export default function AdminPage() {
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCourt, setCurrentCourt] = useState<any>(null); // Quadra sendo editada
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs para os inputs do modal
  const nameRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);

  const loadCourts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('courts')
      .select('*')
      .order('name');
    
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

  // Salva ou atualiza a quadra com base nos dados do modal
  const handleSaveCourt = async () => {
    if (!nameRef.current || !rateRef.current) return;
    
    const updatedCourt = {
      name: nameRef.current.value,
      hourly_rate: parseFloat(rateRef.current.value),
    };

    setIsSaving(true);
    
    let error;
    if (currentCourt) {
      // MODO EDIÇÃO
      const { error: err } = await supabase
        .from('courts')
        .update(updatedCourt)
        .eq('id', currentCourt.id);
      error = err;
    } else {
      // MODO CRIAÇÃO (Opcional - pode manter a criação padrão se preferir)
      const { error: err } = await supabase
        .from('courts')
        .insert({
          ...updatedCourt,
          is_active: true
        });
      error = err;
    }

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      await loadCourts();
      handleCloseModal();
    }
    
    setIsSaving(false);
  };

  const handleDeleteCourt = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover a "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('courts')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erro ao remover: " + error.message);
    } else {
      await loadCourts();
    }
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">Configuração de Quadras</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic mt-2">
              Gestão de valores e disponibilidade
            </p>
          </div>
        </div>

        {/* Botão Adicionar (pode abrir modal também se preferir) */}
        <button 
          onClick={() => handleOpenEditModal(null)} // Abre o modal em modo criação
          className="flex items-center gap-2 bg-[#FFC700] hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
        >
          <Plus size={16} /> Adicionar Quadra
        </button>
      </div>

      {/* LISTA DE QUADRAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4 relative z-0">
          <Loader2 size={40} className="animate-spin text-[#FFC700]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
          {courts.map(court => (
            <div key={court.id} className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-8 space-y-6 shadow-2xl relative group transition-all hover:border-slate-700">
              
              {/* Ícones de Ação no topo direito (Lápis e Lixeira) */}
              <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                <button 
                  onClick={() => handleOpenEditModal(court)}
                  className="p-2 text-slate-600 hover:text-[#FFC700] hover:bg-[#FFC700]/10 rounded-xl transition-all"
                  title="Editar Quadra"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteCourt(court.id, court.name)}
                  className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Excluir Quadra"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificação</label>
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 px-4 text-white font-bold text-sm">
                    {court.name}
                  </div>
                </div>

                {/* Valor */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço da Hora</label>
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 px-4 text-white font-bold text-sm">
                    R$ {court.hourly_rate?.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] shadow-2xl border-t-4 border-t-[#FFC700] p-10 animate-in zoom-in duration-200 text-white relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic">
                  {currentCourt ? 'Editar Quadra' : 'Nova Quadra'}
                </h2>
                <p className="text-[#FFC700] text-xs font-bold mt-2 uppercase tracking-widest">
                  {currentCourt ? currentCourt.name : 'Configurar Espaço'}
                </p>
              </div>
              <button onClick={handleCloseModal} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              {/* Input: Nome */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Quadra</label>
                <input 
                  autoFocus
                  type="text" 
                  ref={nameRef}
                  defaultValue={currentCourt?.name || ""}
                  placeholder="Ex: Quadra Central"
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white focus:border-[#FFC700] outline-none font-bold text-sm" 
                />
              </div>

              {/* Input: Preço */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço da Hora (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  ref={rateRef}
                  defaultValue={currentCourt?.hourly_rate || ""}
                  placeholder="Ex: 85.00"
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white focus:border-[#FFC700] outline-none font-bold text-sm" 
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex flex-col gap-3 pt-6">
                <button 
                  onClick={handleSaveCourt} 
                  disabled={isSaving}
                  className="w-full bg-[#FFC700] hover:bg-yellow-400 disabled:opacity-50 text-black font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} />} 
                  Confirmar e Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK DE SALVAMENTO */}
      {isSaving && (
        <div className="fixed bottom-10 right-10 bg-[#FFC700] text-black px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl z-[150] animate-bounce">
          <Loader2 size={16} className="animate-spin" /> Sincronizando...
        </div>
      )}
    </div>
  );
}