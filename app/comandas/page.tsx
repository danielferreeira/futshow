"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Loader2, User, X, Receipt, 
  Package, CheckCircle, AlertTriangle, Trash2, Edit,
  History, Calendar, DollarSign, Filter, Minus, Eraser
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ComandasPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"ativas" | "historico">("ativas");
  const [orders, setOrders] = useState<any[]>([]);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modais
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  
  // Estados de Input
  const [customerName, setCustomerName] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [searchStock, setSearchStock] = useState(""); // Filtro da barra lateral
  const [searchHistoryName, setSearchHistoryName] = useState("");
  const [searchHistoryDate, setSearchHistoryDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: pData } = await supabase.from('products').select('*').order('name');
    setProducts(pData || []);

    const { data: oData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('status', 'aberta')
      .order('created_at', { ascending: false });
    setOrders(oData || []);

    const { data: cData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('status', 'paga')
      .order('created_at', { ascending: false });
    setClosedOrders(cData || []);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Lógica de Filtros
  const filteredStock = products.filter(p => p.name?.toLowerCase().includes(searchStock.toLowerCase()));
  
  const filteredClosedOrders = closedOrders.filter(order => {
    const matchName = order.customer_name.toLowerCase().includes(searchHistoryName.toLowerCase());
    let matchDate = true;
    if (searchHistoryDate) {
      matchDate = new Date(order.created_at).toISOString().split('T')[0] === searchHistoryDate;
    }
    return matchName && matchDate;
  });

  // Gestão de Itens
  const openItemsModal = (order: any) => {
    setSelectedOrder(order);
    setSelectedProductId("");
    setItemQuantity(1);
    setIsItemsModalOpen(true);
  };

  const handleSaveOrder = async () => {
    if (!customerName) return alert("Digite o nome!");
    setIsSaving(true);
    const { error } = await supabase.from('orders').insert({ customer_name: customerName });
    if (!error) {
      setCustomerName("");
      setIsOrderModalOpen(false);
      loadData();
    }
    setIsSaving(false);
  };

  const addItem = async () => {
    if (!selectedProductId) return alert("Selecione um produto!");
    const product = products.find(p => p.id === selectedProductId);
    if (!product || product.stock < itemQuantity) return alert("Estoque insuficiente!");

    setIsSaving(true);
    const { error } = await supabase.from('order_items').insert({
      order_id: selectedOrder.id,
      product_id: product.id,
      quantity: itemQuantity,
      unit_price: product.price
    });

    if (!error) {
      const newTotal = Number(selectedOrder.total) + (Number(product.price) * itemQuantity);
      await supabase.from('orders').update({ total: newTotal }).eq('id', selectedOrder.id);
      
      await loadData();
      // Atualiza o modal internamente
      const { data: updated } = await supabase.from('orders').select('*, order_items(*, products(name))').eq('id', selectedOrder.id).single();
      setSelectedOrder(updated);
      setSelectedProductId("");
      setItemQuantity(1);
    }
    setIsSaving(false);
  };

  const removeItem = async (item: any) => {
    if (!confirm("Remover item?")) return;
    const { error } = await supabase.from('order_items').delete().eq('id', item.id);
    if (!error) {
      const newTotal = Math.max(0, Number(selectedOrder.total) - (Number(item.unit_price) * item.quantity));
      await supabase.from('orders').update({ total: newTotal }).eq('id', selectedOrder.id);
      await loadData();
      const { data: updated } = await supabase.from('orders').select('*, order_items(*, products(name))').eq('id', selectedOrder.id).single();
      setSelectedOrder(updated);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 space-y-6 pb-20 px-4 text-white">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-6 rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl text-[#FFC700]"><Receipt size={24} /></div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Comandas</h1>
        </div>

        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => setActiveTab("ativas")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'ativas' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Ativas</button>
          <button onClick={() => setActiveTab("historico")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'historico' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Histórico</button>
        </div>

        <button onClick={() => setIsOrderModalOpen(true)} className="bg-[#FFC700] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">+ Abrir Comanda</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* COLUNA ESQUERDA: INFORMAÇÕES DO ESTOQUE (MANTIDAS COMO NA IMAGEM) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-6 shadow-xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2 italic">
              <Package size={14} className="text-[#FFC700]"/> Estoque
            </h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                value={searchStock}
                onChange={(e) => setSearchStock(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold outline-none focus:border-[#FFC700]"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredStock.map(p => (
                <div key={p.id} className="bg-slate-900/50 border border-slate-800/50 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase italic leading-none">{p.name}</p>
                    <p className="text-[#FFC700] text-[9px] font-bold mt-1">R$ {Number(p.price).toFixed(2)}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${p.stock <= p.min_stock ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}>
                    {p.stock} un
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CONTEÚDO PRINCIPAL */}
        <div className="lg:col-span-3">
          {activeTab === 'ativas' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orders.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => openItemsModal(order)}
                  className="bg-[#0F172A] border-l-4 border-l-[#FFC700] border border-slate-800 rounded-[40px] p-8 shadow-2xl hover:border-slate-600 transition-all cursor-pointer relative"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-xl text-[#FFC700]"><User size={18}/></div>
                      <h3 className="text-lg font-black uppercase italic tracking-tighter">{order.customer_name}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase italic">A pagar</p>
                        <p className="text-xl font-black text-[#FFC700]">R$ {Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <span className="text-[10px] font-black bg-slate-900 text-slate-500 px-3 py-1 rounded-full uppercase italic">
                        {order.order_items?.length || 0} Itens
                     </span>
                  </div>
                  <div className="mt-8 flex gap-2">
                     <button className="flex-1 bg-slate-800 text-[9px] font-black uppercase py-3 rounded-xl hover:bg-slate-700">+ Lançar</button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm("Fechar?")) supabase.from('orders').update({ status: 'paga' }).eq('id', order.id).then(() => loadData()); }}
                        className="flex-1 bg-emerald-500 text-black text-[9px] font-black uppercase py-3 rounded-xl"
                     >
                        Receber
                     </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LISTA HISTÓRICO */
            <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase italic">Cliente</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase italic text-right">Valor Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredClosedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-6">
                        <p className="font-black uppercase italic text-sm">{order.customer_name}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                      </td>
                      <td className="p-6 text-right font-black text-emerald-500 italic">R$ {Number(order.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL GESTÃO DE ITENS */}
      {isItemsModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic text-white">{selectedOrder.customer_name}</h2>
              <button onClick={() => setIsItemsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={32}/></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 space-y-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adicionar Item</p>
                 <div className="flex flex-col md:flex-row gap-4">
                    <select 
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-[#FFC700]"
                    >
                      <option value="">Produto...</option>
                      {products.map(p => <option key={p.id} value={p.id} disabled={p.stock < 1}>{p.name} ({p.stock} un)</option>)}
                    </select>
                    <div className="flex items-center bg-slate-900 border-2 border-slate-800 rounded-2xl px-2">
                       <button onClick={() => setItemQuantity(Math.max(1, itemQuantity-1))} className="p-2 text-slate-500"><Minus size={16}/></button>
                       <input type="number" value={itemQuantity} readOnly className="w-12 text-center bg-transparent font-black text-white outline-none" />
                       <button onClick={() => setItemQuantity(itemQuantity+1)} className="p-2 text-slate-500"><Plus size={16}/></button>
                    </div>
                    <button onClick={addItem} disabled={isSaving} className="bg-[#FFC700] text-black font-black px-8 py-4 rounded-2xl text-[10px] uppercase">{isSaving ? "..." : "Lançar"}</button>
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consumo Atual</p>
                 <div className="space-y-3">
                   {selectedOrder.order_items?.map((item: any) => (
                     <div key={item.id} className="flex justify-between items-center bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                        <div className="flex items-center gap-4">
                           <button onClick={() => removeItem(item)} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={16}/></button>
                           <div>
                             <p className="font-black uppercase italic text-sm">{item.products?.name}</p>
                             <p className="text-[10px] font-bold text-slate-600 uppercase">Qtd: {item.quantity} • Unit: R$ {Number(item.unit_price).toFixed(2)}</p>
                           </div>
                        </div>
                        <p className="font-black text-white italic">R$ {(item.quantity * item.unit_price).toFixed(2)}</p>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-900/50 rounded-b-[40px] flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Total Geral</p>
                  <p className="text-3xl font-black text-[#FFC700] italic">R$ {Number(selectedOrder.total).toFixed(2)}</p>
               </div>
               <button 
                onClick={() => { if(confirm("Fechar?")) supabase.from('orders').update({ status: 'paga' }).eq('id', selectedOrder.id).then(() => { setIsItemsModalOpen(false); loadData(); }); }}
                className="bg-emerald-500 text-black font-black px-10 py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl"
               >
                 Fechar Conta
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA COMANDA */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl border-t-4 border-t-[#FFC700]">
            <h2 className="text-2xl font-black uppercase italic mb-8">Abrir Conta</h2>
            <div className="space-y-6">
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-[#FFC700]" placeholder="Nome do Cliente" />
              <button onClick={handleSaveOrder} disabled={isSaving} className="w-full bg-[#FFC700] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs">Confirmar</button>
              <button onClick={() => setIsOrderModalOpen(false)} className="w-full text-slate-500 font-bold text-[10px] uppercase mt-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}