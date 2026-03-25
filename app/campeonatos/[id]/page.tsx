"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, Plus, ArrowLeft, Trash2, Edit, 
  Sword, Loader2, Check, X, Trophy, User, Shield, 
  ChevronRight, Flag, CheckCircle 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ConfirmModal from "@/components/ConfirmModal";

export default function GestaoCampeonatoIDPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"duplas" | "partidas">("duplas");
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<any>(null);
  const [formData, setFormData] = useState({ player1: "", player2: "", teamName: "" });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
      if (tData) setTournament(tData);

      const { data: teamsData } = await supabase
        .from('tournament_teams')
        .select('*, tournament_players(*)')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true });
      setTeams(teamsData || []);

      const { data: matchesData } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          team1:team1_id ( id, name, tournament_players(name) ),
          team2:team2_id ( id, name, tournament_players(name) )
        `)
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('created_at', { ascending: true });

      setMatches(matchesData || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const askDeleteTeam = (team: any) => {
    const hasMatches = matches.some(m => m.team1_id === team.id || m.team2_id === team.id);
    if (hasMatches) {
      setConfirmConfig({
        isOpen: true,
        title: "Ação Bloqueada",
        message: `A dupla "${team.name}" já está no mata-mata. Reinicie a chave para gerenciar as duplas.`,
        variant: "warning",
        onConfirm: () => setConfirmConfig(p => ({ ...p, isOpen: false }))
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Remover Dupla",
      message: `Excluir a dupla "${team.name}" do torneio?`,
      variant: "danger",
      onConfirm: () => executeDeleteTeam(team.id)
    });
  };

  const executeDeleteTeam = async (teamId: string) => {
    setIsSaving(true);
    const { error } = await supabase.from('tournament_teams').delete().eq('id', teamId);
    if (!error) {
      setConfirmConfig(p => ({ ...p, isOpen: false }));
      loadData();
    }
    setIsSaving(false);
  };

  const askResetTournament = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Reiniciar Torneio",
      message: "Isso apagará TODAS as partidas. Deseja continuar?",
      variant: "danger",
      onConfirm: () => executeGenerateMatches()
    });
  };

  const executeGenerateMatches = async () => {
    if (teams.length < 2) return;
    setIsSaving(true);
    try {
      await supabase.from('tournaments').update({ winner_name: null, status: 'inscricoes_abertas' }).eq('id', id);
      await supabase.from('tournament_matches').delete().eq('tournament_id', id);

      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const numMatches = Math.floor(shuffled.length / 2);
      const round1 = [];
      for (let i = 0; i < numMatches * 2; i += 2) {
        round1.push({
          tournament_id: id, team1_id: shuffled[i].id, team2_id: shuffled[i + 1].id,
          round: 1, status: 'pendente'
        });
      }
      await supabase.from('tournament_matches').insert(round1);
      setConfirmConfig(p => ({ ...p, isOpen: false }));
      await loadData();
    } catch (e: any) { console.error(e); }
    setIsSaving(false);
  };

  const handleAdvanceRound = async () => {
    const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    const finishedMatches = currentRoundMatches.filter(m => m.status === 'finalizado');

    if (finishedMatches.length !== currentRoundMatches.length) return;

    setIsSaving(true);
    try {
      const lostIds = matches
        .filter(m => m.status === 'finalizado' && m.winner_id)
        .map(m => m.winner_id === m.team1_id ? m.team2_id : m.team1_id);

      const survivors = teams.filter(t => !lostIds.includes(t.id));
      const nextRoundMatches = [];
      const shuffledSurvivors = [...survivors].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffledSurvivors.length; i += 2) {
        if (shuffledSurvivors[i+1]) {
          nextRoundMatches.push({
            tournament_id: id, team1_id: shuffledSurvivors[i].id, team2_id: shuffledSurvivors[i+1].id,
            round: currentRound + 1, status: 'pendente'
          });
        }
      }
      await supabase.from('tournament_matches').insert(nextRoundMatches);
      await loadData();
    } catch (e: any) { console.error(e); }
    setIsSaving(false);
  };

  const handleSetWinner = async (matchId: string, winnerId: string, winnerName: string) => {
    await supabase.from('tournament_matches').update({ winner_id: winnerId, status: 'finalizado' }).eq('id', matchId);
    const latestMatches = matches.map(m => m.id === matchId ? { ...m, winner_id: winnerId, status: 'finalizado' } : m);
    const lostIds = latestMatches
      .filter(m => m.status === 'finalizado' && m.winner_id)
      .map(m => m.winner_id === m.team1_id ? m.team2_id : m.team1_id);
    
    const survivorsCount = teams.length - lostIds.length;
    if (survivorsCount === 1) {
      await supabase.from('tournaments').update({ winner_name: winnerName, status: 'finalizado' }).eq('id', id);
    }
    loadData();
  };

  const handleSaveTeam = async () => {
    if (!formData.player1 || !formData.player2) return;
    setIsSaving(true);
    try {
      const teamName = formData.teamName || `${formData.player1} & ${formData.player2}`;
      if (currentTeam) {
        await supabase.from('tournament_teams').update({ name: teamName }).eq('id', currentTeam.id);
        const p1 = currentTeam.tournament_players[0];
        const p2 = currentTeam.tournament_players[1];
        if (p1) await supabase.from('tournament_players').update({ name: formData.player1 }).eq('id', p1.id);
        if (p2) await supabase.from('tournament_players').update({ name: formData.player2 }).eq('id', p2.id);
      } else {
        const { data: team } = await supabase.from('tournament_teams').insert({ tournament_id: id, name: teamName }).select().single();
        if (team) await supabase.from('tournament_players').insert([{ team_id: team.id, name: formData.player1 }, { team_id: team.id, name: formData.player2 }]);
      }
      loadData();
      setIsTeamModalOpen(false);
    } catch (e: any) { console.error(e); }
    setIsSaving(false);
  };

  const isFinished = teams.length > 0 && (teams.length - matches.filter(m => m.status === 'finalizado' && m.winner_id).length === 1);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER DA GESTÃO */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => router.push('/campeonatos')} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-[#FFC700] transition-all active:scale-90"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase italic leading-none tracking-tighter truncate max-w-[200px] md:max-w-none">{tournament?.name}</h1>
            <p className="text-[#FFC700] text-[9px] font-black uppercase mt-1.5 tracking-widest italic opacity-80">{tournament?.sport} • {teams.length} Inscritos</p>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full md:w-auto">
          <button onClick={() => setActiveTab("duplas")} className={`flex-1 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'duplas' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Inscritos</button>
          <button onClick={() => setActiveTab("partidas")} className={`flex-1 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'partidas' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Mata-Mata</button>
        </div>
      </div>

      {activeTab === "duplas" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Duplas ({teams.length})</h2>
            <button onClick={() => { setCurrentTeam(null); setFormData({player1:"", player2:"", teamName:""}); setIsTeamModalOpen(true); }} className="bg-[#FFC700] text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-yellow-500/10">+ Inscrever</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {teams.map(team => (
              <div key={team.id} className="bg-[#0F172A] border border-slate-800 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl relative group hover:border-[#FFC700]/30 transition-all">
                <div className="absolute top-6 right-6 flex gap-1">
                   <button onClick={() => { setCurrentTeam(team); setFormData({teamName: team.name, player1: team.tournament_players[0]?.name || "", player2: team.tournament_players[1]?.name || ""}); setIsTeamModalOpen(true); }} className="p-2 text-slate-600 hover:text-[#FFC700]"><Edit size={16}/></button>
                   <button onClick={() => askDeleteTeam(team)} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
                <Users size={24} className="text-[#FFC700] mb-4 opacity-50" />
                <h3 className="text-lg font-black uppercase italic truncate tracking-tighter pr-12">{team.name}</h3>
                <div className="mt-6 space-y-2 border-t border-slate-800/50 pt-4">
                  {team.tournament_players?.map((p:any) => (
                    <div key={p.id} className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase italic">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FFC700]/50" />
                      {p.name || "Atleta"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ABA MATA-MATA */
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Árvore de Competição</h2>
              <p className="text-[10px] font-bold text-[#FFC700] uppercase mt-1 tracking-widest italic">Mata-Mata Direto</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {isFinished ? (
                <button onClick={() => router.push('/campeonatos')} className="flex-1 md:flex-none bg-emerald-500 text-black px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-xl shadow-emerald-500/20"><Flag size={16}/> Finalizar</button>
              ) : (
                <button onClick={handleAdvanceRound} className="flex-1 md:flex-none bg-[#FFC700] text-black px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-yellow-500/10 transition-all">Próxima Fase</button>
              )}
              <button onClick={askResetTournament} className="flex-1 md:flex-none bg-[#0B1120] text-slate-400 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase border border-slate-800 active:scale-95 transition-all">Reiniciar</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {matches.map(match => {
                const isWinner1 = match.winner_id === match.team1_id;
                const isWinner2 = match.winner_id === match.team2_id;
                return (
                  <div key={match.id} className="bg-[#0F172A] border border-slate-800 rounded-[28px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row items-stretch group">
                    <div className="bg-slate-900/50 px-4 py-3 md:py-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 min-w-[80px]">
                      <span className="text-[9px] font-black text-slate-500 uppercase italic md:rotate-[-90deg] whitespace-nowrap">Round {match.round}</span>
                    </div>
                    
                    <button onClick={() => handleSetWinner(match.id, match.team1_id, match.team1?.name)} className={`flex-1 p-6 md:p-10 text-center transition-all relative ${isWinner1 ? 'bg-[#FFC700] text-black' : 'hover:bg-slate-800/30'}`}>
                      <p className="text-xl md:text-2xl font-black uppercase italic leading-none truncate tracking-tighter">{match.team1?.name || "???"}</p>
                      <div className={`mt-3 text-[9px] font-black uppercase italic opacity-60`}>
                        {match.team1?.tournament_players?.map((p: any) => p.name).join(" • ")}
                      </div>
                      {isWinner1 && <CheckCircle size={20} className="absolute top-4 right-4" />}
                    </button>

                    <div className="bg-slate-900/80 flex items-center justify-center px-4 font-black text-slate-700 italic text-[10px] border-y md:border-y-0 md:border-x border-slate-800 uppercase">VS</div>
                    
                    <button onClick={() => handleSetWinner(match.id, match.team2_id, match.team2?.name)} className={`flex-1 p-6 md:p-10 text-center transition-all relative ${isWinner2 ? 'bg-[#FFC700] text-black' : 'hover:bg-slate-800/30'}`}>
                      <p className="text-xl md:text-2xl font-black uppercase italic leading-none truncate tracking-tighter">{match.team2?.name || "???"}</p>
                      <div className={`mt-3 text-[9px] font-black uppercase italic opacity-60`}>
                        {match.team2?.tournament_players?.map((p: any) => p.name).join(" • ")}
                      </div>
                      {isWinner2 && <CheckCircle size={20} className="absolute top-4 right-4" />}
                    </button>
                  </div>
                )
              })}
              {matches.length === 0 && <div className="text-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[40px] text-slate-600 font-black uppercase italic text-[10px]">Sorteie a chave para começar</div>}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-6 md:p-8 shadow-xl border-t-4 border-t-[#FFC700] sticky top-32">
                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#FFC700] mb-6 italic"><Shield size={14} /> Espera (BYE)</h3>
                <div className="space-y-2">
                  {(() => {
                    const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 1;
                    const teamsInMatches = matches.filter(m => m.round === currentRound).flatMap(m => [m.team1_id, m.team2_id]);
                    const lostIds = matches.filter(m => m.status === 'finalizado' && m.winner_id).map(m => m.winner_id === m.team1_id ? m.team2_id : m.team1_id);
                    const byeTeams = teams.filter(t => !lostIds.includes(t.id) && !teamsInMatches.includes(t.id));
                    if (byeTeams.length === 0) return <p className="text-[9px] font-black text-slate-700 uppercase italic py-4">Sem folga nesta fase</p>;
                    return byeTeams.map(t => (
                      <div key={t.id} className="bg-[#0B1120] border border-slate-800 p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in">
                        <User size={12} className="text-[#FFC700] opacity-50"/>
                        <span className="text-[10px] font-black uppercase text-slate-300 truncate italic">{t.name}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSCRIÇÃO PREMIUM (DESIGN FS) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border-2 border-slate-800 border-t-[#FFC700] border-t-4 w-full max-w-md rounded-[48px] p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300 text-white">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{currentTeam ? 'Editar' : 'Nova'} Inscrição</h2>
                <p className="text-[#FFC700] text-[9px] font-black mt-2 uppercase tracking-[0.2em] italic">Arena Maravilha</p>
              </div>
              <button onClick={() => setIsTeamModalOpen(false)} className="bg-slate-800/50 p-2 rounded-full text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Nome da Dupla</label>
                <input autoFocus type="text" value={formData.teamName || ""} onChange={e => setFormData({...formData, teamName: e.target.value})} placeholder="Ex: Dupla do Bar" className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-6 font-bold italic text-sm focus:border-[#FFC700] outline-none transition-all" />
              </div>

              <div className="space-y-4 p-5 bg-[#0B1120] rounded-[28px] border border-slate-800 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase italic ml-1">Atleta 1</label>
                  <input type="text" value={formData.player1 || ""} onChange={e => setFormData({...formData, player1: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold text-sm outline-none focus:border-[#FFC700]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase italic ml-1">Atleta 2</label>
                  <input type="text" value={formData.player2 || ""} onChange={e => setFormData({...formData, player2: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold text-sm outline-none focus:border-[#FFC700]" />
                </div>
              </div>

              <button onClick={handleSaveTeam} disabled={isSaving} className="w-full bg-[#FFC700] text-black font-black py-5 rounded-3xl uppercase tracking-widest text-[11px] shadow-lg shadow-yellow-500/10 active:scale-95 transition-all mt-2">
                {isSaving ? "Gravando..." : "Confirmar Dupla"}
              </button>
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