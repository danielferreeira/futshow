"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Loader2, User, X, Receipt, 
  Package, CheckCircle, Trash2, Edit,
  Minus, RefreshCcw, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

export default function ComandasPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"ativas" | "historico">("ativas");
  const [orders, setOrders] = useState<any[]>([]);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  
  const [customerName, setCustomerName] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [searchStock, setSearchStock] = useState(""); 
  const [searchHistoryName, setSearchHistoryName] = useState("");

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

  const filteredStock = products.filter(p => p.name?.toLowerCase().includes(searchStock.toLowerCase()));
  
  const filteredClosedOrders = closedOrders.filter(order => 
    order.customer_name.toLowerCase().includes(searchHistoryName.toLowerCase())
  );

  const openItemsModal = (order: any) => {
    setSelectedOrder(order);
    setCustomerName(order.customer_name);
    setSelectedProductId("");
    setItemQuantity(1);
    setIsItemsModalOpen(true);
  };

  const handleSaveOrder = async () => {
    if (!customerName) return;
    setIsSaving(true);
    
    if (selectedOrder) {
      const { error } = await supabase.from('orders').update({ customer_name: customerName }).eq('id', selectedOrder.id);
      if (!error) {
        setIsOrderModalOpen(false);
        await loadData();
        const { data: updated } = await supabase.from('orders').select('*, order_items(*, products(name))').eq('id', selectedOrder.id).single();
        setSelectedOrder(updated);
      }
    } else {
      const { error } = await supabase.from('orders').insert({ customer_name: customerName });
      if (!error) {
        setCustomerName("");
        setIsOrderModalOpen(false);
        loadData();
      }
    }
    setIsSaving(false);
  };

  const handleFinalizeOrder = async (orderId: string) => {
    setIsSaving(true);
    const { error } = await supabase.from('orders').update({ status: 'paga' }).eq('id', orderId);
    if (!error) {
      setIsItemsModalOpen(false);
      loadData();
    }
    setIsSaving(false);
  };

  const handleReopenOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ status: 'aberta' }).eq('id', orderId);
    if (!error) {
      setIsItemsModalOpen(false);
      loadData();
    }
  };

  const askDeleteOrder = (orderId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Excluir Registro",
      message: "Tem certeza que deseja apagar esta comanda? Esta ação é irreversível.",
      onConfirm: async () => {
        setIsSaving(true);
        await supabase.from('orders').delete().eq('id', orderId);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setIsItemsModalOpen(false);
        loadData();
        setIsSaving(false);
      }
    });
  };

  const addItem = async () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product || product.stock < itemQuantity) return;

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
      const { data: updated } = await supabase.from('orders').select('*, order_items(*, products(name))').eq('id', selectedOrder.id).single();
      setSelectedOrder(updated);
      setSelectedProductId("");
      setItemQuantity(1);
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A0F1C]"><Loader2 className="animate-spin text-[#FFC700]" size={40} /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 px-2 md:px-4 text-white pt-24 md:pt-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F172A] p-4 md:p-5 rounded-[24px] md:rounded-[32px] border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-slate-800 rounded-xl text-[#FFC700]"><Receipt size={20} /></div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase italic leading-none">Comandas</h1>
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Gestão de Consumo</p>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full md:w-auto justify-between">
          <button onClick={() => setActiveTab("ativas")} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'ativas' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Ativas</button>
          <button onClick={() => setActiveTab("historico")} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'historico' ? 'bg-[#FFC700] text-black shadow-lg' : 'text-slate-500'}`}>Histórico</button>
        </div>

        <button onClick={() => { setSelectedOrder(null); setCustomerName(""); setIsOrderModalOpen(true); }} className="w-full md:w-auto bg-[#FFC700] text-black px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-yellow-500/10 transition-all">
          + Abrir Comanda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* BARRA LATERAL ESTOQUE: OCULTA NO MOBILE (hidden) E FIXA NO DESKTOP (lg:block sticky) */}
        <div className="hidden lg:block lg:col-span-1 order-2 lg:order-1">
          <div className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-5 shadow-xl sticky top-32">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2 italic">
              <Package size={14} className="text-[#FFC700]"/> Estoque Rápido
            </h2>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input type="text" placeholder="Buscar..." value={searchStock} onChange={(e) => setSearchStock(e.target.value)} className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold outline-none italic" />
            </div>
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
              {filteredStock.map(p => (
                <div key={p.id} className="bg-slate-900/40 border border-slate-800/50 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase italic leading-none">{p.name}</p>
                    <p className="text-emerald-500 text-[9px] font-bold mt-1 italic">R$ {Number(p.price).toFixed(2)}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${p.stock <= p.min_stock ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}>{p.stock} un</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LISTA DE COMANDAS */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {activeTab === 'ativas' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {orders.map(order => (
                <div key={order.id} onClick={() => openItemsModal(order)} className="bg-[#0F172A] border-l-4 border-l-[#FFC700] border border-slate-800 rounded-[28px] md:rounded-[40px] p-6 shadow-2xl active:scale-95 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-xl text-[#FFC700]"><User size={18}/></div>
                      <h3 className="text-base md:text-lg font-black uppercase italic tracking-tighter leading-tight">{order.customer_name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase italic leading-none">Total</p>
                      <p className="text-xl font-black text-[#FFC700] mt-1">R$ {Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <div className="flex-1 bg-slate-900/50 text-[9px] font-black uppercase py-3 rounded-xl text-center border border-slate-800 text-slate-400">Ver Itens</div>
                    <div className="flex-1 bg-emerald-500 text-black text-[9px] font-black uppercase py-3 rounded-xl text-center shadow-lg shadow-emerald-500/10">Receber</div>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <div className="col-span-full py-12 text-center text-slate-600 font-black uppercase italic text-[10px] border-2 border-dashed border-slate-800 rounded-[32px]">Nenhuma comanda aberta</div>}
            </div>
          ) : (
            <div className="bg-[#0F172A] border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="p-5 text-[10px] font-black text-slate-500 uppercase italic">Cliente</th>
                      <th className="p-5 text-[10px] font-black text-slate-500 uppercase italic text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredClosedOrders.map(order => (
                      <tr key={order.id} onClick={() => openItemsModal(order)} className="hover:bg-slate-800/20 transition-colors cursor-pointer group">
                        <td className="p-5">
                          <p className="font-black uppercase italic text-sm group-hover:text-[#FFC700] transition-colors">{order.customer_name}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                        </td>
                        <td className="p-5 text-right font-black text-emerald-500 italic">R$ {Number(order.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL GESTÃO DE ITENS */}
      {isItemsModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border-2 border-slate-800 border-t-[#FFC700] border-t-4 w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in duration-300">
            <div className="p-6 md:p-8 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-[#0F172A] rounded-t-[40px] z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-black uppercase italic text-white leading-none">{selectedOrder.customer_name}</h2>
                <button onClick={() => { setCustomerName(selectedOrder.customer_name); setIsOrderModalOpen(true); }} className="p-2 text-slate-500 hover:text-[#FFC700]"><Edit size={16}/></button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => askDeleteOrder(selectedOrder.id)} className="p-2 text-red-500/30 hover:text-red-500"><Trash2 size={20}/></button>
                <button onClick={() => setIsItemsModalOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400"><X size={20}/></button>
              </div>
            </div>

            <div className="p-4 md:p-8 overflow-y-auto flex-1 space-y-6 no-scrollbar">
              <div className="bg-[#0B1120] p-5 rounded-[28px] border border-slate-800 space-y-4 shadow-inner">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Lançar Item</p>
                <div className="flex flex-col gap-3">
                  <select 
                    value={selectedProductId} 
                    onChange={(e) => setSelectedProductId(e.target.value)} 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl py-4 px-4 text-xs font-black text-white outline-none focus:border-[#FFC700] appearance-none italic"
                  >
                    <option value="">Buscar produto...</option>
                    {products.map(p => (
                      <option 
                        key={p.id} 
                        value={p.id} 
                        disabled={p.stock < 1}
                        className={p.stock <= p.min_stock ? "text-red-500" : "text-white"}
                      >
                        {p.name} — {p.stock < 1 ? 'ESGOTADO' : `(${p.stock} un.)`}
                        {p.stock > 0 && p.stock <= p.min_stock ? ' BAIXO' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center justify-between bg-slate-900 border-2 border-slate-800 rounded-xl px-4 py-3">
                      <button onClick={() => setItemQuantity(Math.max(1, itemQuantity-1))} className="p-1 text-slate-500 hover:text-[#FFC700]"><Minus size={20}/></button>
                      <span className="font-black text-white text-lg italic">{itemQuantity}</span>
                      <button onClick={() => setItemQuantity(itemQuantity+1)} className="p-1 text-slate-500 hover:text-[#FFC700]"><Plus size={20}/></button>
                    </div>
                    <button onClick={addItem} disabled={isSaving || !selectedProductId} className="flex-[2] bg-[#FFC700] text-black font-black py-4 rounded-xl text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                      {isSaving ? "Lançando..." : "Lançar Agora"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Consumo da Mesa</p>
                <div className="space-y-2">
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <button className="p-2 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        <div>
                          <p className="font-black uppercase italic text-xs leading-none">{item.products?.name}</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase mt-1 italic">{item.quantity}un • R$ {Number(item.unit_price).toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="font-black text-white italic text-sm">R$ {(item.quantity * item.unit_price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-800 bg-[#0F172A] rounded-b-[40px] flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <p className="text-[9px] font-black text-slate-500 uppercase italic leading-none">Total da Conta</p>
                <p className="text-4xl font-black text-[#FFC700] italic leading-none mt-2">R$ {Number(selectedOrder.total).toFixed(2)}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button 
                  onClick={() => selectedOrder.status === 'aberta' ? handleFinalizeOrder(selectedOrder.id) : handleReopenOrder(selectedOrder.id)} 
                  className={`w-full sm:w-auto font-black px-12 py-5 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center gap-2 ${selectedOrder.status === 'aberta' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-white'}`}
                >
                  {selectedOrder.status === 'aberta' ? 'Receber Agora' : 'Reabrir Comanda'}
                </button>
                <button onClick={() => setIsItemsModalOpen(false)} className="w-full sm:w-auto bg-slate-900 border border-slate-800 text-slate-400 font-black px-8 py-5 rounded-2xl text-[10px] uppercase">Sair</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOME (POPOUP PREMIUM FS) */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0F172A] border-2 border-slate-800 border-t-[#FFC700] border-t-4 w-full max-w-md rounded-[48px] p-8 md:p-10 shadow-2xl animate-in zoom-in">
            <h2 className="text-2xl font-black uppercase italic mb-8 text-white">{selectedOrder ? 'Alterar' : 'Nova'} Comanda</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Nome do Cliente / Mesa</label>
                <input autoFocus type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[#0B1120] border-2 border-slate-800 rounded-2xl py-5 px-6 text-white font-bold outline-none focus:border-[#FFC700] italic" placeholder="Ex: Mesa 04" />
              </div>
              <button onClick={handleSaveOrder} disabled={isSaving || !customerName} className="w-full bg-[#FFC700] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all">
                {isSaving ? "Gravando..." : "Confirmar Abertura"}
              </button>
              <button onClick={() => setIsOrderModalOpen(false)} className="w-full text-slate-600 font-bold text-[9px] uppercase hover:text-white transition-colors tracking-widest">Cancelar</button>
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
        isLoading={isSaving}
      />
    </div>
  );
}