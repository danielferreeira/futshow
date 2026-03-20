"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, Plus, ArrowLeft, Trash2, Edit, 
  Sword, Loader2, Check, X, Trophy, User, Shield, ChevronRight, Flag
} from "lucide-react";

export default function GestaoCampeonatoIDPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"duplas" | "partidas">("duplas");
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
          team1:team1_id ( name, tournament_players(name) ),
          team2:team2_id ( name, tournament_players(name) )
        `)
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('created_at', { ascending: true });

      setMatches(matchesData || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- SORTEIO ---
  const handleGenerateMatches = async () => {
    if (teams.length < 2) return alert("Precisa de pelo menos 2 duplas!");
    if (!confirm(`Reiniciar torneio e gerar novo sorteio?`)) return;

    setIsSaving(true);
    try {
      await supabase.from('tournaments').update({ winner_name: null, status: 'inscricoes_abertas' }).eq('id', id);
      await supabase.from('tournament_matches').delete().eq('tournament_id', id);

      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const numMatches = Math.floor(shuffled.length / 2);
      const round1 = [];
      for (let i = 0; i < numMatches * 2; i += 2) {
        round1.push({
          tournament_id: id,
          team1_id: shuffled[i].id,
          team2_id: shuffled[i + 1].id,
          round: 1,
          status: 'pendente'
        });
      }
      await supabase.from('tournament_matches').insert(round1);
      await loadData();
    } catch (e: any) { alert(e.message); }
    setIsSaving(false);
  };

  // --- AVANÇO DE FASE ---
  const handleAdvanceRound = async () => {
    const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    const finishedMatches = currentRoundMatches.filter(m => m.status === 'finalizado');

    if (currentRoundMatches.length === 0) return alert("Gere o sorteio primeiro!");
    if (finishedMatches.length !== currentRoundMatches.length) return alert("Finalize todos os jogos da rodada atual!");

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
            tournament_id: id,
            team1_id: shuffledSurvivors[i].id,
            team2_id: shuffledSurvivors[i+1].id,
            round: currentRound + 1,
            status: 'pendente'
          });
        }
      }
      await supabase.from('tournament_matches').insert(nextRoundMatches);
      await loadData();
    } catch (e: any) { alert(e.message); }
    setIsSaving(false);
  };

  // --- VENCEDOR ---
  const handleSetWinner = async (matchId: string, winnerId: string, winnerName: string) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, winner_id: winnerId, status: 'finalizado' } : m));
    await supabase.from('tournament_matches').update({ winner_id: winnerId, status: 'finalizado' }).eq('id', matchId);

    const latestMatches = matches.map(m => m.id === matchId ? { ...m, winner_id: winnerId, status: 'finalizado' } : m);
    const lostIds = latestMatches
      .filter(m => m.status === 'finalizado' && m.winner_id)
      .map(m => m.winner_id === m.team1_id ? m.team2_id : m.team1_id);
    
    const survivorsCount = teams.length - lostIds.length;

    if (survivorsCount === 1) {
      await supabase.from('tournaments').update({ winner_name: winnerName, status: 'finalizado' }).eq('id', id);
      loadData();
    }
  };

  // --- DUPLAS ---
  const handleSaveTeam = async () => {
    if (!formData.player1 || !formData.player2) return alert("Preencha os atletas!");
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
    } catch (e: any) { alert(e.message); }
    setIsSaving(false);
  };

  // --- CÁLCULO DE FINALIZAÇÃO ---
  const finishedMatchesCount = matches.filter(m => m.status === 'finalizado' && m.winner_id).length;
  const isFinished = teams.length > 0 && (teams.length - finishedMatchesCount === 1);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/campeonatos')} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black uppercase italic leading-none">{tournament?.name}</h1>
            <p className="text-[#FFC700] text-[10px] font-bold uppercase mt-2 tracking-widest">{tournament?.sport} • {teams.length} Duplas</p>
          </div>
        </div>
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => setActiveTab("duplas")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'duplas' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Duplas</button>
          <button onClick={() => setActiveTab("partidas")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'partidas' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Mata-Mata</button>
        </div>
      </div>

      {activeTab === "duplas" && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 italic">Inscritos ({teams.length})</h2>
            <button onClick={() => { setCurrentTeam(null); setFormData({player1:"", player2:"", teamName:""}); setIsTeamModalOpen(true); }} className="bg-[#FFC700] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"><Plus size={16} className="inline mr-2"/> Inscrever Dupla</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teams.map(team => (
              <div key={team.id} className="bg-[#0F172A] border border-slate-800 p-8 rounded-[40px] shadow-2xl relative group transition-all hover:border-slate-700">
                <div className="absolute top-6 right-6 flex gap-2">
                   <button onClick={() => { setCurrentTeam(team); setFormData({teamName: team.name, player1: team.tournament_players[0]?.name || "", player2: team.tournament_players[1]?.name || ""}); setIsTeamModalOpen(true); }} className="text-slate-600 hover:text-[#FFC700] transition-colors"><Edit size={16}/></button>
                   <button onClick={async () => { if(confirm("Remover?")) { await supabase.from('tournament_teams').delete().eq('id', team.id); loadData(); } }} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
                <Users size={24} className="text-[#FFC700] mb-4" />
                <h3 className="text-lg font-black uppercase italic truncate">{team.name}</h3>
                <div className="mt-4 space-y-2">
                  {team.tournament_players?.map((p:any) => <div key={p.id} className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase"><User size={12}/> {p.name || ""}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "partidas" && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 italic">Mata-Mata</h2>
              <p className="text-[10px] font-bold text-[#FFC700] uppercase mt-1 tracking-widest italic">Acompanhamento em Tempo Real</p>
            </div>
            <div className="flex gap-3">
              {/* BOTÃO DINÂMICO DE PRÓXIMA FASE OU ENCERRAR */}
              {isFinished ? (
                <button 
                  onClick={() => router.push('/campeonatos')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95 animate-pulse"
                >
                  <Flag size={16}/> Encerrar Torneio
                </button>
              ) : (
                <button 
                  onClick={handleAdvanceRound} 
                  className="bg-[#FFC700] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95"
                >
                  <ChevronRight size={16}/> Próxima Fase
                </button>
              )}
              
              <button onClick={handleGenerateMatches} className="bg-slate-800 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase border border-slate-700 transition-all active:scale-95">Reiniciar</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {matches.map(match => {
                const isWinner1 = match.winner_id === match.team1_id;
                const isWinner2 = match.winner_id === match.team2_id;
                return (
                  <div key={match.id} className="bg-[#0F172A] border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row items-stretch transition-all hover:border-slate-700">
                    <div className="bg-slate-900/50 px-6 py-4 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 min-w-[100px]"><span className="text-[10px] font-black text-slate-500 uppercase italic">Rodada {match.round}</span></div>
                    
                    <button onClick={() => handleSetWinner(match.id, match.team1_id, match.team1?.name)} className={`flex-1 p-10 text-center transition-all ${isWinner1 ? 'bg-[#FFC700] text-black' : 'hover:bg-slate-800/50 text-white'}`}>
                      <p className="text-2xl font-black uppercase italic leading-tight tracking-tighter">{match.team1?.name || "Dupla A"}</p>
                      <div className={`flex justify-center gap-2 mt-2 opacity-60 text-[10px] font-bold uppercase italic ${isWinner1 ? 'text-black' : 'text-slate-400'}`}>
                        {match.team1?.tournament_players?.map((p: any, idx: number) => (
                          <span key={idx}>{p.name}{idx === 0 && match.team1.tournament_players.length > 1 ? " • " : ""}</span>
                        ))}
                      </div>
                      {isWinner1 && <Check size={24} className="mx-auto mt-4" />}
                    </button>

                    <div className="bg-slate-900 flex items-center justify-center px-4 font-black text-slate-700 italic text-xs border-y md:border-y-0 md:border-x border-slate-800 italic">VS</div>
                    
                    <button onClick={() => handleSetWinner(match.id, match.team2_id, match.team2?.name)} className={`flex-1 p-10 text-center transition-all ${isWinner2 ? 'bg-[#FFC700] text-black' : 'hover:bg-slate-800/50 text-white'}`}>
                      <p className="text-2xl font-black uppercase italic leading-tight tracking-tighter">{match.team2?.name || "Dupla B"}</p>
                      <div className={`flex justify-center gap-2 mt-2 opacity-60 text-[10px] font-bold uppercase italic ${isWinner2 ? 'text-black' : 'text-slate-400'}`}>
                        {match.team2?.tournament_players?.map((p: any, idx: number) => (
                          <span key={idx}>{p.name}{idx === 0 && match.team2.tournament_players.length > 1 ? " • " : ""}</span>
                        ))}
                      </div>
                      {isWinner2 && <Check size={24} className="mx-auto mt-4" />}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-6 shadow-xl border-t-2 border-t-[#FFC700]">
                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#FFC700] mb-6 italic"><Trophy size={14} /> Status</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Aguardando (BYE):</p>
                <div className="space-y-2">
                  {(() => {
                    const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 1;
                    const teamsInMatches = matches.filter(m => m.round === currentRound).flatMap(m => [m.team1_id, m.team2_id]);
                    const lostTeamIds = matches.filter(m => m.status === 'finalizado' && m.winner_id).map(m => m.winner_id === m.team1_id ? m.team2_id : m.team1_id);
                    const byeTeams = teams.filter(t => !lostTeamIds.includes(t.id) && !teamsInMatches.includes(t.id));
                    if (byeTeams.length === 0) return <p className="text-[10px] font-bold text-slate-700 uppercase italic py-2">Ninguém de folga</p>;
                    return byeTeams.map(t => (
                      <div key={t.id} className="bg-slate-900/50 border border-dashed border-slate-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in"><div className="p-2 bg-slate-800 rounded-lg text-[#FFC700]"><Shield size={12} /></div><span className="text-[11px] font-black uppercase text-white truncate">{t.name}</span></div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700]">
            <h2 className="text-2xl font-black uppercase italic text-white mb-8">{currentTeam ? 'Editar' : 'Inscrever'} Dupla</h2>
            <div className="space-y-6">
              <input type="text" value={formData.teamName || ""} onChange={e => setFormData({...formData, teamName: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold" placeholder="Nome da Dupla" />
              <div className="space-y-4 p-6 bg-slate-900/40 rounded-[32px] border border-slate-800">
                <input type="text" value={formData.player1 || ""} onChange={e => setFormData({...formData, player1: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold" placeholder="Atleta 1" />
                <input type="text" value={formData.player2 || ""} onChange={e => setFormData({...formData, player2: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold" placeholder="Atleta 2" />
              </div>
              <button onClick={handleSaveTeam} disabled={isSaving} className="w-full bg-[#FFC700] hover:bg-yellow-400 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl">Salvar Inscrição</button>
            </div>
          </div>
        </div>
      )}

      {isSaving && <div className="fixed bottom-10 right-10 bg-[#FFC700] text-black px-6 py-4 rounded-3xl font-black text-[10px] flex items-center gap-3 animate-bounce shadow-2xl z-[150]"><Loader2 size={16} className="animate-spin" /> Processando...</div>}
    </div>
  );
}