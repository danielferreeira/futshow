"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Trash2, Edit, X, 
  Check, Loader2, AlertTriangle, BoxIcon
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export default function EstoquePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para Exclusão
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Bebida",
    price: "",
    stock: "",
    min_stock: "5"
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // --- HANDLERS DE EXCLUSÃO ---
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

  const handleDeleteClick = (product: any) => {
    setItemToDelete(product);
    // Primeiro configuramos o modal de pergunta (Danger)
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

    // 1. VERIFICAÇÃO DE VÍNCULO
    const { count } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);

    if (count && count > 0) {
      // 2. SE TIVER VÍNCULO: Transforma o modal em Aviso (Warning)
      setConfirmConfig({
        isOpen: true,
        title: "Ação Bloqueada",
        message: `Não é possível excluir "${product.name}". Este produto já foi lançado em comandas. Para manter o histórico financeiro, ele deve permanecer no banco.`,
        variant: "warning",
        onConfirm: undefined // Remove a função de confirmar
      });
      setIsSaving(false);
      return;
    }

    // 3. SE ESTIVER LIMPO: Deleta
    await supabase.from('products').delete().eq('id', product.id);
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    loadProducts();
    setIsSaving(false);
  };
  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      setIsSaving(true);

      // 1. VERIFICAÇÃO DE VÍNCULO: Checa se o produto existe em alguma comanda
      const { count, error: checkError } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', itemToDelete.id);

      if (checkError) {
        alert("Erro ao verificar integridade do produto.");
        setIsSaving(false);
        return;
      }

      // 2. BLOQUEIO: Se o count for maior que zero, impede a exclusão
      if (count && count > 0) {
        alert(`Não é possível excluir "${itemToDelete.name}".\n\nEste produto já foi lançado em comandas (ativas ou fechadas). Para manter o histórico financeiro correto, o sistema não permite a exclusão de itens com movimentação.`);
        setIsConfirmOpen(false);
        setItemToDelete(null);
        setIsSaving(false);
        return;
      }

      // 3. EXECUÇÃO: Se estiver limpo, exclui
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', itemToDelete.id);

      if (!deleteError) {
        setIsConfirmOpen(false);
        setItemToDelete(null);
        loadProducts();
      } else {
        alert("Erro ao excluir: " + deleteError.message);
      }
      
      setIsSaving(false);
    }
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
    if (!formData.name || !formData.price) return alert("Preencha nome e preço!");
    
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
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      
      {/* HEADER PADRONIZADO */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700]">
            <BoxIcon size={24}/>
          </div>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">Controle de Estoque</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic mt-1">Gestão de insumos e produtos</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-600" size={16} />
            <input 
              type="text" 
              placeholder="Buscar item..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold focus:border-[#FFC700] outline-none transition-all w-64"
            />
          </div>
          <button onClick={() => handleOpenModal()} className="bg-[#FFC700] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all">
            <Plus size={16} /> Novo Item
          </button>
        </div>
      </div>

      {/* TABELA PREMIUM */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Produto</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Preço</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-center">Quantidade</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Gerenciar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-white">
            {filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors group">
                <td className="p-6">
                  <p className="font-black uppercase italic text-sm group-hover:text-[#FFC700] transition-colors">{p.name}</p>
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{p.category}</span>
                </td>
                <td className="p-6 font-black text-emerald-500 italic">R$ {Number(p.price).toFixed(2)}</td>
                <td className="p-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs ${p.stock <= p.min_stock ? 'bg-red-500/10 text-red-500' : 'bg-slate-900 text-slate-400'}`}>
                    {p.stock} un {p.stock <= p.min_stock && <AlertTriangle size={14} className="animate-pulse" />}
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-600 hover:text-[#FFC700] transition-colors"><Edit size={18}/></button>
                    <button onClick={() => handleDeleteClick(p)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="p-20 text-center text-slate-600 font-black uppercase italic text-xs">Nenhum produto cadastrado</div>
        )}
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700] animate-in zoom-in duration-200 text-white">
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                {currentProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição do Item</label>
                <input 
                  autoFocus
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700]" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700] appearance-none"
                  >
                    <option value="Bebida">Bebida</option>
                    <option value="Lanche">Lanche</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Qtd Atual</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none">Estoque Mín.</label>
                  <input 
                    type="number" 
                    value={formData.min_stock} 
                    onChange={e => setFormData({...formData, min_stock: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold outline-none focus:border-[#FFC700]" 
                  />
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full bg-[#FFC700] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Salvar no Sistema'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE DE CONFIRMAÇÃO DE EXCLUSÃO */}
     
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