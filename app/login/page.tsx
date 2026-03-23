"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Lock, Mail, Loader2, Trophy, Eye, EyeOff 
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    if (data.user) {
      // Força o refresh das rotas do Next.js
      router.refresh();
      
      // Aguarda 800ms para o cookie "assentar" no browser e então redireciona
      setTimeout(() => {
        window.location.assign('/'); 
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md">
        
        {/* LOGO E TÍTULO - REPLICANDO A IMAGEM */}
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-slate-900 rounded-[24px] text-[#FFC700] mb-4 shadow-2xl border border-slate-800">
            <Trophy size={40} />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
            Arena <span className="text-[#FFC700]">Futshow</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">
            Painel Administrativo
          </p>
        </div>

        {/* CARTÃO DE LOGIN COM Borda Dourada sutil */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
          {/* Borda dourada sutil superior */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFC700] to-transparent opacity-50"></div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Mensagem de Erro Animada */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase p-4 rounded-2xl text-center animate-shake">
                {error}
              </div>
            )}

            {/* Campo E-MAIL ADMIN */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">
                E-mail Admin
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-slate-600" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#FFC700] outline-none font-bold transition-all italic"
                  placeholder="admin@futshow.com"
                />
              </div>
            </div>

            {/* Campo SENHA com Visibilidade Alternável */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-slate-600" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-white focus:border-[#FFC700] outline-none font-bold transition-all"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão ENTRAR NO SISTEMA */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#FFC700] hover:bg-yellow-400 disabled:opacity-50 text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>
        </div>

        {/* Texto de Rodapé */}
        <p className="text-center text-slate-600 text-[9px] font-bold uppercase mt-8 tracking-widest italic">
          Acesso restrito aos administradores da Arena
        </p>
      </div>
    </div>
  );
}