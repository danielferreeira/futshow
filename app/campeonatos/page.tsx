"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Plus, Calendar, Medal, 
  Trash2, Edit, X, Check, Loader2, ArrowRight, Users, Search
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

const SPORTS_OPTIONS = ["Futevôlei", "Beach Tennis", "Vôlei"];

export default function CampeonatosPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTournament, setCurrentTournament] = useState<any>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
  });

  const [formData, setFormData] = useState({
    name: "", 
    sport: "Futevôlei", 
    start_date: "", 
    status: "inscricoes_abertas",
    max_teams: "16"
  });

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTournaments(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  const handleDeleteClick = (tournament: any) => {
    if (tournament.winner_name) {
      setConfirmConfig({
        isOpen: true,
        title: "Ação Bloqueada",
        message: `O torneio "${tournament.name}" já possui um campeão e não pode ser excluído.`,
        variant: "warning",
        onConfirm: undefined
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Excluir Torneio",
      message: `Deseja apagar "${tournament.name}"? Esta ação é irreversível.`,
      variant: "danger",
      onConfirm: () => executeDelete(tournament)
    });
  };

  const executeDelete = async (tournament: any) => {
    setIsSaving(true);
    const { count } = await supabase
      .from('tournament_teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id);

    if (count && count > 0) {
      setConfirmConfig({
        isOpen: true,
        title: "Torneio com Duplas",
        message: `Não é possível excluir. Existem ${count} duplas inscritas.`,
        variant: "warning",
        onConfirm: undefined
      });
    } else {
      await supabase.from('tournaments').delete().eq('id', tournament.id);
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      loadTournaments();
    }
    setIsSaving(false);
  };

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
      setFormData({ 
        name: "", 
        sport: "Futevôlei", 
        start_date: new Date().toISOString().split('T')[0], 
        status: "inscricoes_abertas", 
        max_teams: "16" 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setIsSaving(true);
    
    const payload = { 
      name: formData.name,
      sport: formData.sport,
      start_date: formData.start_date,
      status: formData.status,
      max_teams: parseInt(formData.max_teams) || 16
    };

    const { error } = currentTournament 
      ? await supabase.from('tournaments').update(payload).eq('id', currentTournament.id)
      : await supabase.from('tournaments').insert(payload);

    if (!error) {
      await loadTournaments();
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const filtered = tournaments.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER E BUSCA */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700] shadow-inner"><Trophy size={24} /></div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase italic tracking-tighter leading-none">Campeonatos</h1>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic mt-1">Arena Maravilha</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input 
              type="text" 
              placeholder="Buscar torneio..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:border-[#FFC700] outline-none italic transition-all" 
            />
          </div>
          <button onClick={() => handleOpenModal()} className="w-full sm:w-auto bg-[#FFC700] text-black px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/10 active:scale-95 transition-all">
            + Novo Torneio
          </button>
        </div>
      </div>

      {/* GRID DE CAMPEONATOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filtered.map(t => (
          <div key={t.id} className="bg-[#0F172A] border border-slate-800 rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-2xl relative group hover:border-[#FFC700]/30 transition-all flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border italic ${t.winner_name ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-[#FFC700]/20 text-[#FFC700] bg-yellow-500/5'}`}>
                  {t.winner_name ? 'FINALIZADO' : 'EM ANDAMENTO'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenModal(t)} className="p-2 text-slate-600 hover:text-[#FFC700] transition-colors"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteClick(t)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white uppercase italic leading-tight tracking-tighter">{t.name}</h3>
              <p className="text-[#FFC700] text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">{t.sport}</p>
              
              {t.winner_name && (
                <div className="mt-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in zoom-in">
                  <Medal size={24} className="text-emerald-500" />
                  <div>
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Campeão</p>
                    <p className="text-sm font-black text-white uppercase italic">{t.winner_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-6">
              <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center text-slate-400 text-[10px] font-black uppercase italic tracking-widest">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-600" /><span>{t.start_date ? format(parseISO(t.start_date), "dd/MM/yy") : "--/--/--"}</span></div>
                <div className="flex items-center gap-2"><Users size={14} className="text-slate-600" /><span>Max: {t.max_teams} duplas</span></div>
              </div>
              <Link href={`/campeonatos/${t.id}`} className="w-full bg-[#0B1120] border-2 border-slate-800 hover:border-[#FFC700] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-inner">
                Gerenciar Chaves <ArrowRight size={14} className="text-[#FFC700]" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CADASTRO (DESIGN PREMIUM FS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border-2 border-slate-800 border-t-[#FFC700] border-t-4 w-full max-w-md rounded-[48px] p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300 text-white relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{currentTournament ? 'Editar' : 'Novo'} Torneio</h2>
                <p className="text-[#FFC700] text-[9px] font-black mt-2 uppercase tracking-[0.2em] italic">Circuito Futshow</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-800/50 p-2 rounded-full text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Nome do Evento</label>
                <input 
                  autoFocus
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Copa Verão de Futevôlei"
                  className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-3xl py-4 px-6 font-bold italic text-sm focus:border-[#FFC700] outline-none transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Modalidade</label>
                  <select 
                    value={formData.sport} 
                    onChange={e => setFormData({...formData, sport: e.target.value})} 
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700] appearance-none italic text-sm"
                  >
                    {SPORTS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Máx. Duplas</label>
                  <input 
                    type="number" 
                    value={formData.max_teams} 
                    onChange={e => setFormData({...formData, max_teams: e.target.value})} 
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700] italic" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Data de Início</label>
                <input 
                  type="date" 
                  value={formData.start_date} 
                  onChange={e => setFormData({...formData, start_date: e.target.value})} 
                  className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold focus:border-[#FFC700] outline-none color-scheme-dark" 
                />
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving || !formData.name} 
                className="w-full bg-[#FFC700] text-black font-black py-5 rounded-3xl uppercase tracking-widest text-[11px] shadow-lg shadow-yellow-500/10 active:scale-95 transition-all mt-2"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirmar e Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
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