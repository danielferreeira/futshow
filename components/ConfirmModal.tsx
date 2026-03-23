"use client";

import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void; // Opcional agora
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Fechar",
  isLoading = false,
  variant = "danger"
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isWarning = variant === "warning";
  const colorClass = isWarning ? "border-t-yellow-500" : "border-t-red-500";
  const iconBg = isWarning ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500";
  const buttonBg = isWarning ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-500 hover:bg-red-600 text-white";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-[#0F172A] border border-slate-800 w-full max-w-sm rounded-[40px] shadow-2xl border-t-4 ${colorClass} p-10 animate-in zoom-in duration-300 relative`}>
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${iconBg} rounded-3xl flex items-center justify-center mb-6`}>
            {isWarning ? <AlertTriangle size={40} /> : <Trash2 size={40} />}
          </div>
          
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-tight">
            {title}
          </h2>
          
          <p className="text-slate-400 text-sm font-bold mt-4 leading-relaxed uppercase italic">
            {message}
          </p>

          <div className="flex flex-col w-full gap-3 mt-8">
            {/* Se for apenas um aviso (warning), mostramos apenas o botão de fechar estilizado */}
            {!isWarning ? (
              <>
                <button 
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : confirmText}
                </button>
                <button onClick={onClose} className="w-full bg-slate-800 text-slate-400 font-black py-5 rounded-2xl uppercase tracking-widest text-[10px]">
                  {cancelText}
                </button>
              </>
            ) : (
              <button 
                onClick={onClose}
                className="w-full bg-[#FFC700] hover:bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl"
              >
                Entendi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}