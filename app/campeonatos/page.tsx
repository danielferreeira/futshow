"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, Plus, Calendar, Medal, 
  Trash2, Edit, X, Check, Loader2, ArrowRight, Users, Search,
  CheckCircle // Adicionado para corrigir o ReferenceError
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

  // Controle do Modal de Confirmação
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

  // Ajustado para usar 'sport' conforme seu banco original
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

  // --- LÓGICA DE EXCLUSÃO COM TRAVAS ---
  const handleDeleteClick = (tournament: any) => {
    // Bloqueia se já tiver ganhador
    if (tournament.winner_name) {
      setConfirmConfig({
        isOpen: true,
        title: "Ação Bloqueada",
        message: `O torneio "${tournament.name}" já possui um campeão e não pode ser excluído para não afetar o histórico.`,
        variant: "warning",
        onConfirm: undefined
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Excluir Torneio",
      message: `Deseja apagar "${tournament.name}"? O sistema checará se há duplas antes de deletar.`,
      variant: "danger",
      onConfirm: () => executeDelete(tournament)
    });
  };

  const executeDelete = async (tournament: any) => {
    setIsSaving(true);
    // Verifica se existem times vinculados
    const { count } = await supabase
      .from('tournament_teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id);

    if (count && count > 0) {
      setConfirmConfig({
        isOpen: true,
        title: "Torneio com Duplas",
        message: `Não é possível excluir. Existem ${count} duplas inscritas. Remova os inscritos primeiro.`,
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
    if (!formData.name) return alert("Digite o nome!");
    setIsSaving(true);
    
    const payload = { 
      name: formData.name,
      sport: formData.sport, // Garanta que aqui está 'sport'
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
    } else {
      alert("Erro ao salvar: Verifique se os campos coincidem com o banco.");
      console.error(error);
    }
    setIsSaving(false);
  };

  const filtered = tournaments.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-5 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700]"><Trophy size={24} /></div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Campeonatos</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-3 text-slate-600" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-slate-900 border border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold focus:border-[#FFC700] outline-none w-64" 
            />
          </div>
          <button onClick={() => handleOpenModal()} className="bg-[#FFC700] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">+ Novo Torneio</button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(t => (
          <div key={t.id} className="bg-[#0F172A] border border-slate-800 rounded-[40px] p-8 shadow-2xl relative group hover:border-slate-700 transition-all flex flex-col justify-between min-h-[350px]">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-[#FFC700]/20 text-[#FFC700]">
                  {t.winner_name ? 'FINALIZADO' : 'EM ANDAMENTO'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(t)} className="text-slate-600 hover:text-[#FFC700]"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteClick(t)} className="text-slate-600 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
              <h3 className="text-xl font-black text-white uppercase italic leading-tight">{t.name}</h3>
              <p className="text-[#FFC700] text-[10px] font-black uppercase tracking-[0.2em] mt-1">{t.sport}</p>
              
              {t.winner_name && (
                <div className="mt-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in zoom-in">
                  <Medal size={20} className="text-[#FFC700]" />
                  <div>
                    <p className="text-[8px] font-black text-yellow-600 uppercase tracking-widest mb-1">Campeão</p>
                    <p className="text-sm font-black text-white uppercase italic">{t.winner_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 mt-4">
              <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center text-slate-400 text-[11px] font-bold uppercase">
                <div className="flex items-center gap-2"><Calendar size={14} /><span>{t.start_date ? format(parseISO(t.start_date), "dd/MM/yy") : "--/--/--"}</span></div>
                <div className="flex items-center gap-2"><Users size={14} /><span>Max: {t.max_teams}</span></div>
              </div>
              <Link href={`/campeonatos/${t.id}`} className="w-full bg-slate-900 border border-slate-800 hover:border-[#FFC700] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
                Gerenciar Chaves <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700] animate-in zoom-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic text-white">{currentTournament ? 'Editar' : 'Novo'} Torneio</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nome do Torneio</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white focus:border-[#FFC700] outline-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Modalidade</label>
                  <select value={formData.sport} onChange={e => setFormData({...formData, sport: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none">
                    {SPORTS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Máx. Duplas</label>
                  <input type="number" value={formData.max_teams} onChange={e => setFormData({...formData, max_teams: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Data de Início</label>
                <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none color-scheme-dark" />
              </div>
              <button onClick={handleSave} disabled={isSaving} className="w-full bg-[#FFC700] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar e Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO / AVISO */}
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