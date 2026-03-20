"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Plus, Calendar, Medal, 
  Trash2, Edit, X, Check, Loader2, ArrowRight, Users
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

const SPORTS = ["Futevôlei", "Beach Tennis", "Vôlei"];

export default function CampeonatosPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTournament, setCurrentTournament] = useState<any>(null);
  
  // Estado inicial com strings vazias para evitar erro de uncontrolled input
  const [formData, setFormData] = useState({
    name: "", 
    sport: "Futevôlei", 
    start_date: "", 
    status: "inscricoes_abertas",
    max_teams: "16"
  });

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    // Buscamos os torneios incluindo a coluna winner_name que criamos no banco
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTournaments(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  const handleOpenModal = (tournament?: any) => {
    if (tournament) {
      setCurrentTournament(tournament);
      setFormData({
        name: tournament.name || "",
        sport: tournament.sport || "Futevôlei",
        start_date: tournament.start_date || "",
        status: tournament.status || "inscricoes_abertas",
        max_teams: tournament.max_teams?.toString() || "16"
      });
    } else {
      setCurrentTournament(null);
      setFormData({ name: "", sport: "Futevôlei", start_date: "", status: "inscricoes_abertas", max_teams: "16" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = { 
      ...formData, 
      max_teams: parseInt(formData.max_teams) || 16 
    };

    let error;
    if (currentTournament) {
      const { error: err } = await supabase.from('tournaments').update(payload).eq('id', currentTournament.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('tournaments').insert(payload);
      error = err;
    }

    if (!error) {
      await loadTournaments();
      setIsModalOpen(false);
    } else {
      alert("Erro ao salvar: " + error.message);
    }
    setIsSaving(false);
  };

  const deleteTournament = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir permanentemente o torneio "${name}"?`)) return;
    await supabase.from('tournaments').delete().eq('id', id);
    loadTournaments();
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-tighter italic leading-none">Campeonatos</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Gestão e Histórico de Torneios</p>
          </div>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#FFC700] hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-yellow-500/10 active:scale-95"
        >
          <Plus size={16} className="inline mr-2" /> Novo Torneio
        </button>
      </div>

      {/* GRID DE TORNEIOS */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(t => (
            <div key={t.id} className="bg-[#0F172A] border border-slate-800 rounded-[40px] p-8 space-y-6 shadow-2xl relative group transition-all hover:border-slate-700">
              
              {/* TOP CARD: STATUS E AÇÕES */}
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                  t.winner_name ? 'bg-yellow-500/10 text-[#FFC700] border-yellow-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {t.winner_name ? 'FINALIZADO' : t.status.replace('_', ' ')}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(t)} className="text-slate-600 hover:text-[#FFC700] p-1 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => deleteTournament(t.id, t.name)} className="text-slate-600 hover:text-red-500 p-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* CONTEÚDO PRINCIPAL */}
              <div>
                <h3 className="text-xl font-black text-white uppercase italic leading-tight tracking-tighter">{t.name}</h3>
                <p className="text-[#FFC700] text-[10px] font-black uppercase tracking-[0.2em] mt-1">{t.sport}</p>
              </div>

              {/* EXIBIÇÃO DO CAMPEÃO (Aparece apenas se houver um vencedor) */}
              {t.winner_name && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="p-2 bg-yellow-500/20 rounded-lg text-[#FFC700]">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-yellow-600 uppercase tracking-widest leading-none mb-1">Grande Campeão</p>
                    <p className="text-sm font-black text-white uppercase italic leading-none">{t.winner_name}</p>
                  </div>
                </div>
              )}

              {/* INFO RODAPÉ DO CARD */}
              <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center text-slate-400 text-[11px] font-bold uppercase">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-600" /> 
                  <span>{t.start_date ? format(parseISO(t.start_date), "dd/MM/yy") : "--/--/--"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-600" /> 
                  <span>Max: {t.max_teams || 16}</span>
                </div>
              </div>

              {/* BOTÃO DE ACESSO */}
              <Link 
                href={`/campeonatos/${t.id}`} 
                className="w-full bg-slate-900 border border-slate-800 hover:border-[#FFC700] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group-hover:bg-slate-800"
              >
                Gerenciar Torneio <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm text-white">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700] animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic">{currentTournament ? 'Editar' : 'Novo'} Torneio</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Torneio</label>
                <input 
                  type="text" 
                  value={formData.name || ""} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white focus:border-[#FFC700] outline-none font-bold" 
                  placeholder="Ex: Open de Verão"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Início</label>
                  <input 
                    type="date" 
                    value={formData.start_date || ""} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-[#FFC700] outline-none font-bold text-xs" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Limite Duplas</label>
                  <input 
                    type="number" 
                    value={formData.max_teams || ""} 
                    onChange={e => setFormData({...formData, max_teams: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-[#FFC700] outline-none font-bold text-xs" 
                    placeholder="16"
                  />
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full bg-[#FFC700] hover:bg-yellow-400 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} />} Salvar Torneio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}