"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Trash2, Edit, X, 
  Check, Loader2, AlertTriangle, BoxIcon, ChevronRight
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export default function EstoquePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Bebida",
    price: "",
    stock: "",
    min_stock: "5"
  });

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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // --- LOGICA DE EXCLUSÃO ---
  const handleDeleteClick = (product: any) => {
    setItemToDelete(product);
    setConfirmConfig({
      isOpen: true,
      title: "Remover Item",
      message: `Deseja excluir "${product.name}"? Esta ação afetará registros de comandas.`,
      variant: "danger",
      onConfirm: () => executeDelete(product)
    });
  };

  const executeDelete = async (product: any) => {
    setIsSaving(true);
    const { count } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);

    if (count && count > 0) {
      setConfirmConfig({
        isOpen: true,
        title: "Ação Bloqueada",
        message: `Não é possível excluir "${product.name}". Este produto já foi lançado em comandas.`,
        variant: "warning",
        onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      });
      setIsSaving(false);
      return;
    }

    await supabase.from('products').delete().eq('id', product.id);
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    loadProducts();
    setIsSaving(false);
  };

  // --- GESTÃO DE PRODUTO ---
  const handleOpenModal = (product?: any) => {
    if (product) {
      setCurrentProduct(product);
      setFormData({
        name: product.name || "",
        category: product.category || "Bebida",
        price: product.price?.toString() || "",
        stock: product.stock?.toString() || "",
        min_stock: product.min_stock?.toString() || "5"
      });
    } else {
      setCurrentProduct(null);
      setFormData({ name: "", category: "Bebida", price: "", stock: "", min_stock: "5" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) return;
    setIsSaving(true);
    const payload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(String(formData.price).replace(',', '.')) || 0,
        stock: parseInt(String(formData.stock)) || 0,
        min_stock: parseInt(String(formData.min_stock)) || 5
    };

    const { error } = currentProduct 
      ? await supabase.from('products').update(payload).eq('id', currentProduct.id)
      : await supabase.from('products').insert(payload);

    if (!error) {
      await loadProducts();
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER BUSCA E ADICIONAR */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-slate-800 rounded-xl text-[#FFC700]">
            <BoxIcon size={20}/>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase italic leading-none">Estoque</h1>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic mt-1">Arena Futshow</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input 
              type="text" 
              placeholder="Buscar item..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:border-[#FFC700] outline-none italic transition-all"
            />
          </div>
          <button onClick={() => handleOpenModal()} className="w-full sm:w-auto bg-[#FFC700] text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Plus size={16} /> Novo Item
          </button>
        </div>
      </div>

      {/* VERSÃO DESKTOP: TABELA */}
      <div className="hidden md:block bg-[#0F172A] border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Produto</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Preço</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-center">Quantidade</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors group">
                <td className="p-6">
                  <p className="font-black uppercase italic text-sm group-hover:text-[#FFC700] transition-colors">{p.name}</p>
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{p.category}</span>
                </td>
                <td className="p-6 font-black text-emerald-500 italic text-lg">R$ {Number(p.price).toFixed(2)}</td>
                <td className="p-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs ${p.stock <= p.min_stock ? 'bg-red-500/10 text-red-500 ring-1 ring-red-500/20' : 'bg-slate-900 text-slate-400'}`}>
                    {p.stock} un {p.stock <= p.min_stock && <AlertTriangle size={14} className="animate-pulse" />}
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(p)} className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-[#FFC700] transition-all"><Edit size={18}/></button>
                    <button onClick={() => handleDeleteClick(p)} className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VERSÃO MOBILE: CARDS */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map(p => (
          <div key={p.id} className="bg-[#0F172A] border border-slate-800 rounded-[24px] p-5 shadow-lg relative overflow-hidden">
            {p.stock <= p.min_stock && (
              <div className="absolute top-0 right-0 bg-red-500 text-white p-1 px-3 rounded-bl-xl">
                <AlertTriangle size={12} />
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-black uppercase italic text-base leading-tight">{p.name}</p>
                <span className="text-[9px] text-slate-600 font-bold uppercase">{p.category}</span>
              </div>
              <p className="font-black text-emerald-500 italic">R$ {Number(p.price).toFixed(2)}</p>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className={`flex-1 flex items-center justify-between p-3 rounded-xl ${p.stock <= p.min_stock ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-900'}`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estoque</span>
                <span className={`font-black italic ${p.stock <= p.min_stock ? 'text-red-500' : 'text-white'}`}>{p.stock} un</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(p)} className="p-3 bg-slate-800 rounded-xl text-slate-400"><Edit size={18}/></button>
                <button onClick={() => handleDeleteClick(p)} className="p-3 bg-slate-800 rounded-xl text-red-500/50"><Trash2 size={18}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL FLUTUANTE (DESIGN PADRÃO FS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0F172A] w-full max-w-md rounded-[48px] border-2 border-slate-800 border-t-[#FFC700] border-t-4 shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in duration-300 text-white relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
                  {currentProduct ? 'Editar Item' : 'Novo Item'}
                </h2>
                <p className="text-[#FFC700] text-[9px] font-black mt-2 uppercase tracking-[0.2em] italic">Catálogo Futshow</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500"><X size={28}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Nome do Produto</label>
                <input 
                  autoFocus
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-3xl py-4 px-6 font-bold italic text-sm focus:border-[#FFC700] outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Categoria</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700] appearance-none italic text-sm"
                  >
                    <option value="Bebida">Bebida</option>
                    <option value="Lanche">Lanche</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Preço (R$)</label>
                  <input 
                    type="number" step="0.01" value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700] text-emerald-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Qtd Atual</label>
                  <input 
                    type="number" value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Mínimo</label>
                  <input 
                    type="number" value={formData.min_stock} 
                    onChange={e => setFormData({...formData, min_stock: e.target.value})} 
                    className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700]" 
                  />
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full bg-[#FFC700] text-black font-black py-5 rounded-3xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Salvar Produto'}
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