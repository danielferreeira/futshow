"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, 
  Plus, Trash2, Edit, Loader2, Receipt, X, Check, 
  ChevronLeft, ChevronRight, LayoutList, PieChart, Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ConfirmModal from "@/components/ConfirmModal";

const CATEGORIES = ["Todas", "Geral", "Luz", "Água", "Aluguel", "Fornecedores", "Manutenção", "Marketing", "Limpeza"];

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<"lancamentos" | "resumo">("lancamentos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [manualRecords, setManualRecords] = useState<any[]>([]);
  const [ordersRevenue, setOrdersRevenue] = useState(0);
  const [bookingsRevenue, setBookingsRevenue] = useState(0);

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState({
    description: "", amount: "", type: "despesa", category: "Geral", date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    setStartDate(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(currentMonth), 'yyyy-MM-dd'));
  }, [currentMonth]);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    
    const { data: orders } = await supabase.from('orders').select('total').eq('status', 'paga').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
    setOrdersRevenue(orders?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0);

    const { data: bookings } = await supabase.from('bookings').select('price').eq('status', 'confirmado').gte('start_time', startDate).lte('start_time', endDate + 'T23:59:59');
    setBookingsRevenue(bookings?.reduce((acc, curr) => acc + Number(curr.price), 0) || 0);

    const { data: manual } = await supabase.from('finance_records').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
    setManualRecords(manual || []);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { loadFinanceData(); }, [loadFinanceData]);

  // Handlers
  const handleDeleteClick = (id: string) => { setItemToDelete(id); setIsConfirmOpen(true); };
  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      setIsSaving(true);
      const { error } = await supabase.from('finance_records').delete().eq('id', itemToDelete);
      if (!error) { setIsConfirmOpen(false); setItemToDelete(null); loadFinanceData(); }
      setIsSaving(false);
    }
  };

  const handleOpenModal = (record?: any) => {
    if (record) {
      setEditingRecord(record);
      setFormData({ description: record.description, amount: record.amount.toString(), type: record.type, category: record.category, date: record.date });
    } else {
      setEditingRecord(null);
      setFormData({ description: "", amount: "", type: "despesa", category: "Geral", date: format(new Date(), 'yyyy-MM-dd') });
    }
    setIsModalOpen(true);
  };

  const handleSaveRecord = async () => {
    if (!formData.description || !formData.amount) return alert("Preencha os campos!");
    setIsSaving(true);
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    const { error } = editingRecord ? await supabase.from('finance_records').update(payload).eq('id', editingRecord.id) : await supabase.from('finance_records').insert(payload);
    if (!error) { setIsModalOpen(false); loadFinanceData(); }
    setIsSaving(false);
  };

  // Cálculos e Filtro
  const filteredRecords = manualRecords.filter(r => categoryFilter === "Todas" || r.category === categoryFilter);
  const manualIncome = manualRecords.filter(r => r.type === 'receita').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const manualExpense = manualRecords.filter(r => r.type === 'despesa').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalIncome = ordersRevenue + bookingsRevenue + manualIncome;
  const netBalance = totalIncome - manualExpense;

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      
      {/* HEADER SUPERIOR */}
      <div className="flex flex-col lg:flex-row items-center justify-between bg-[#0F172A] p-5 rounded-[32px] border border-slate-800 shadow-xl gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700]"><DollarSign size={24} /></div>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">Financeiro</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic mt-1">Fluxo de Caixa Arena Maravilha</p>
          </div>
        </div>

        {/* CONTROLE DE MÊS */}
        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-slate-400 hover:text-white transition-all"><ChevronLeft size={20} /></button>
          <span className="text-[11px] font-black uppercase italic text-white min-w-[120px] text-center">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-slate-400 hover:text-white transition-all"><ChevronRight size={20} /></button>
        </div>

        {/* BOTÕES DE AÇÃO LADO A LADO */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex gap-1">
            <button 
              onClick={() => setActiveTab("lancamentos")}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'lancamentos' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutList size={14} /> Lista
            </button>
            <button 
              onClick={() => setActiveTab("resumo")}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'resumo' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <PieChart size={14} /> Resumo
            </button>
          </div>

          <button onClick={() => handleOpenModal()} className="bg-emerald-500 text-black px-6 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10">
            <Plus size={16} /> Lançar
          </button>
        </div>
      </div>

      {activeTab === "lancamentos" ? (
        /* --- ABA 1: LANÇAMENTOS COM FILTRO DE CATEGORIA --- */
        <div className="space-y-4 animate-in fade-in duration-500">
          
          {/* BARRA DE FILTROS POR CATEGORIA */}
          <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-[24px] flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 text-slate-500 border-r border-slate-800 mr-2">
              <Filter size={14} />
              <span className="text-[10px] font-black uppercase italic">Filtrar:</span>
            </div>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all ${categoryFilter === cat ? 'bg-[#FFC700] text-black border-[#FFC700]' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase italic">Data</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase italic">Descrição / Categoria</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase italic text-right">Valor</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase italic text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {filteredRecords.map(record => (
                    <tr key={record.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-6 text-[11px] font-black text-slate-400 italic">{format(parseISO(record.date), 'dd/MM')}</td>
                      <td className="p-6">
                        <p className="font-black uppercase italic text-sm text-white">{record.description}</p>
                        <span className="text-[9px] text-[#FFC700] font-black uppercase italic opacity-70">{record.category}</span>
                      </td>
                      <td className={`p-6 text-right font-black italic text-base ${record.type === 'receita' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {record.type === 'receita' ? '+' : '-'} R$ {Number(record.amount).toFixed(2)}
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenModal(record)} className="p-2 text-slate-600 hover:text-white transition-colors"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteClick(record.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* --- ABA 2: RESUMO ESTRATÉGICO --- */
        <div className="space-y-8 animate-in zoom-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0F172A] border border-slate-800 p-8 rounded-[32px] shadow-xl border-t-4 border-t-emerald-500">
              <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2 tracking-widest">Entradas Totais</p>
              <h3 className="text-3xl font-black text-emerald-500 italic">R$ {totalIncome.toFixed(2)}</h3>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 p-8 rounded-[32px] shadow-xl border-t-4 border-t-red-500">
              <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2 tracking-widest">Saídas operacionais</p>
              <h3 className="text-3xl font-black text-red-500 italic">R$ {manualExpense.toFixed(2)}</h3>
            </div>
            <div className={`bg-[#0F172A] border-2 p-8 rounded-[32px] shadow-xl ${netBalance >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2 tracking-widest">Saldo Líquido</p>
              <h3 className={`text-3xl font-black italic ${netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>R$ {netBalance.toFixed(2)}</h3>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 p-8 rounded-[32px] shadow-xl border-t-4 border-t-[#FFC700]">
              <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2 tracking-widest">Receita do Bar</p>
              <h3 className="text-3xl font-black text-[#FFC700] italic">R$ {ordersRevenue.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] p-10 shadow-xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 italic">Fontes de Faturamento</h2>
            <div className="space-y-8">
              {[
                { label: "Quadras", val: bookingsRevenue, color: "bg-[#FFC700]" },
                { label: "Bar", val: ordersRevenue, color: "bg-emerald-500" },
                { label: "Lançamentos Manuais", val: manualIncome, color: "bg-blue-500" }
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-black uppercase text-slate-400 italic">{item.label}</span>
                    <span className="text-sm font-black text-white italic">R$ {item.val.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: `${(item.val/totalIncome)*100 || 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700]">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">{editingRecord ? 'Editar' : 'Novo'} Registro</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
                  <button onClick={() => setFormData({...formData, type: 'receita'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'receita' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>Receita</button>
                  <button onClick={() => setFormData({...formData, type: 'despesa'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'despesa' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>Despesa</button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Descrição</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-[#FFC700] italic" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Categoria</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-[#FFC700]"
                  >
                    {CATEGORIES.filter(c => c !== "Todas").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Valor (R$)</label>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-[#FFC700]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Data</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-[#FFC700] color-scheme-dark" />
                  </div>
                </div>
                <button onClick={handleSaveRecord} disabled={isSaving} className="w-full bg-[#FFC700] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Salvar no Financeiro'}
                </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} isLoading={isSaving} title="Excluir?" message="Remover este registro afetará o saldo mensal." />
    </div>
  );
}