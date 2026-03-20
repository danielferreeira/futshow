"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Trash2, Edit, X, 
  Check, Loader2, AlertTriangle, ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function EstoquePage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
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
    
    // Garantimos que os valores são números válidos antes de enviar
    const payload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(String(formData.price).replace(',', '.')) || 0,
        stock: parseInt(String(formData.stock)) || 0,
        min_stock: parseInt(String(formData.min_stock)) || 5
    };

    try {
        const { error } = currentProduct 
        ? await supabase.from('products').update(payload).eq('id', currentProduct.id)
        : await supabase.from('products').insert(payload);

        if (error) throw error;
        
        await loadProducts();
        setIsModalOpen(false);
    } catch (e: any) {
        console.error(e);
        alert("Erro do Banco: " + e.message);
    } finally {
        setIsSaving(false);
    }
    };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/comandas')} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-black uppercase italic leading-none tracking-tighter">Estoque</h1>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-[#FFC700] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all">
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-800">
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Produto</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Preço</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-center">Estoque</th>
              <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-6">
                  <p className="font-black uppercase italic text-sm">{p.name}</p>
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{p.category}</span>
                </td>
                <td className="p-6 font-black text-[#FFC700]">R$ {Number(p.price).toFixed(2)}</td>
                <td className="p-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs ${p.stock <= p.min_stock ? 'bg-red-500/10 text-red-500' : 'bg-slate-900 text-slate-400'}`}>
                    {p.stock} {p.stock <= p.min_stock && <AlertTriangle size={14} className="animate-pulse" />}
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-500 hover:text-[#FFC700]"><Edit size={18}/></button>
                    <button onClick={async () => { if(confirm("Excluir?")) { await supabase.from('products').delete().eq('id', p.id); loadProducts(); } }} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL REVISADO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700] animate-in zoom-in duration-200">
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">
                {currentProduct ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* NOME */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Produto</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold text-white outline-none focus:border-[#FFC700] transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* CATEGORIA */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold text-white outline-none focus:border-[#FFC700] appearance-none"
                  >
                    <option value="Bebida">Bebida</option>
                    <option value="Lanche">Lanche</option>
                  </select>
                </div>

                {/* PREÇO */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço de Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold text-white outline-none focus:border-[#FFC700]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ESTOQUE */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Qtd Inicial em Estoque</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold text-white outline-none focus:border-[#FFC700]" 
                  />
                </div>

                {/* ALERTA */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-none">Alerta Mínimo <span className="text-[8px] opacity-50 block">(Reposição)</span></label>
                  <input 
                    type="number" 
                    value={formData.min_stock} 
                    onChange={e => setFormData({...formData, min_stock: e.target.value})} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 font-bold text-white outline-none focus:border-[#FFC700]" 
                  />
                </div>
              </div>

              {/* BOTÃO COM CARREGAMENTO CENTRALIZADO */}
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full bg-[#FFC700] hover:bg-yellow-400 text-black font-black py-5 rounded-3xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 shadow-xl shadow-yellow-500/10"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar no Estoque</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}