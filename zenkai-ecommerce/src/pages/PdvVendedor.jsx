import { useState, useEffect, useRef } from 'react';
import { Package, Search, ShoppingCart, LogOut, Plus, Trash2, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function PdvVendedor() {
  const [produtos, setProdutos] = useState([]);
  const [venda, setVenda] = useState([]);
  const [aba, setAba] = useState('venda');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const nav = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', categoria: '', estoque: '', img: null });

  const loadDados = async () => {
    try { setProdutos(await api.getProdutos()); } 
    catch (e) { console.error(e); }
  };

  useEffect(() => { loadDados(); }, []);

  const handleVenda = async () => {
    if (venda.length === 0) return;
    setLoading(true);
    try {
      await api.checkout({
        total: venda.reduce((a, i) => a + (i.preco * i.qtd), 0),
        itens: venda.map(i => ({ produto_id: i.id, quantidade: i.qtd, preco_unitario: i.preco }))
      });
      alert('Venda PDV Autorizada!');
      setVenda([]);
      loadDados(); // Sincroniza estoque na hora
    } catch (e) { alert('Erro: ' + e.message); } 
    finally { setLoading(false); }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(k => { if (form[k]) fd.append(k === 'img' ? 'imagem' : k, form[k]); });
      await api.criarProduto(fd);
      setForm({ nome: '', descricao: '', preco: '', categoria: '', estoque: '', img: null });
      if (fileRef.current) fileRef.current.value = "";
      alert('Produto injetado no DB!');
      loadDados();
    } catch (e) { alert(e.message); } 
    finally { setLoading(false); }
  };

  const excluirDb = async (id) => {
    if(!window.confirm('Excluir do banco de dados definitivamente?')) return;
    try {
      await api.excluirProduto(id);
      loadDados();
    } catch(e) { alert(e.message); }
  };

  const add = (p) => {
    const ex = venda.find(i => i.id === p.id);
    setVenda(ex ? venda.map(i => i.id === p.id ? {...i, qtd: i.qtd+1} : i) : [...venda, {...p, qtd: 1}]);
  };
  const upQtd = (id, d) => setVenda(venda.map(i => i.id === id ? {...i, qtd: Math.max(1, i.qtd+d)} : i));

  return (
    <div className="h-screen flex bg-[#0f1115] text-white font-sans overflow-hidden selection:bg-[#39ff14] selection:text-black">
      {/* SIDEBAR LATERAL */}
      <aside className="w-20 lg:w-64 border-r border-white/10 bg-[#161920] flex flex-col p-4 shadow-xl z-10">
        <h1 className="hidden lg:block text-2xl font-black mb-10 pl-2">
          ZEN<span className="text-[#39ff14]">KAI</span> <span className="text-[10px] text-gray-500 uppercase tracking-widest align-top">PDV</span>
        </h1>
        <nav className="flex-1 space-y-2">
          {['venda', 'estoque'].map(a => (
            <button key={a} onClick={() => setAba(a)} className={`w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-xl font-bold transition-all ${aba === a ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              {a === 'venda' ? <ShoppingCart size={22}/> : <Package size={22}/>}
              <span className="hidden lg:block capitalize">{a}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => { api.logout(); nav('/'); }} className="w-full flex justify-center lg:justify-start items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
          <LogOut size={22} /> <span className="hidden lg:block font-bold">Encerrar Sessão</span>
        </button>
      </aside>

      {/* ÁREA CENTRAL */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden relative bg-[#0f1115]">
        {aba === 'venda' ? (
          <div className="h-full flex flex-col">
             <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Bipar ou buscar código/nome..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-[#161920] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-[#39ff14] transition-all shadow-inner text-lg font-mono" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => add(p)} className="bg-[#161920] border border-white/5 p-5 rounded-2xl text-left hover:border-[#39ff14] hover:bg-[#39ff14]/5 transition-all group flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{p.categoria}</span>
                    <h3 className="font-bold text-base mb-2 flex-1">{p.nome}</h3>
                    <div className="flex justify-between items-end w-full">
                       <span className="text-xs px-2 py-1 bg-black rounded border border-white/5 text-gray-400 font-mono">QTD: {p.estoque}</span>
                       <span className="text-[#39ff14] font-mono font-bold">R$ {p.preco.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col pb-4">
            <h2 className="text-2xl font-black mb-6 text-[#39ff14] flex items-center gap-3"><Package/> GERENCIADOR CENTRAL</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-160px)]">
              {/* FORMULÁRIO */}
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 overflow-y-auto custom-scrollbar shadow-2xl">
                <form onSubmit={handleCadastro} className="space-y-5">
                  <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome</label>
                    <input required className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})}/></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</label>
                    <textarea rows="2" className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})}/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preço (R$)</label>
                      <input required type="number" step="0.01" className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none font-mono text-[#39ff14]" value={form.preco} onChange={e=>setForm({...form, preco: e.target.value})}/></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estoque Atual</label>
                      <input required type="number" className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none font-mono" value={form.estoque} onChange={e=>setForm({...form, estoque: e.target.value})}/></div>
                  </div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
                    <input required className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.categoria} onChange={e=>setForm({...form, categoria: e.target.value})}/></div>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#39ff14] cursor-pointer bg-black/50 transition-colors">
                     <input type="file" ref={fileRef} onChange={e=>setForm({...form, img: e.target.files[0]})} className="hidden" id="up"/>
                     <label htmlFor="up" className="cursor-pointer flex flex-col items-center"><UploadCloud size={28} className="text-gray-500 mb-2"/> <span className="text-sm text-[#39ff14] font-bold">{form.img ? form.img.name : 'Anexar Imagem'}</span></label>
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-[#39ff14] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50">{loading ? 'ENVIANDO...' : 'SALVAR NO SISTEMA'}</button>
                </form>
              </div>
              {/* LISTA DB */}
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 overflow-y-auto custom-scrollbar shadow-2xl">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-4">Produtos Registrados ({produtos.length})</h3>
                 <div className="space-y-3">
                   {produtos.map(p => (
                     <div key={p.id} className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl hover:border-red-500/30 transition-colors">
                       <div className="flex items-center gap-4 truncate">
                          <div className="w-10 h-10 bg-black rounded border border-white/10 flex-shrink-0 overflow-hidden"><img src={p.imagem || 'https://via.placeholder.com/40'} className="w-full h-full object-cover"/></div>
                          <div className="truncate"><p className="font-bold text-sm truncate">{p.nome}</p><p className="text-[10px] text-gray-500 font-mono">QTD: {p.estoque} | R$ {p.preco.toFixed(2)}</p></div>
                       </div>
                       <button onClick={()=>excluirDb(p.id)} className="text-red-500 p-2 hover:bg-red-500 hover:text-white rounded-lg transition-colors ml-2 flex-shrink-0"><Trash2 size={16}/></button>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CARRINHO PDV */}
      {aba === 'venda' && (
        <section className="w-96 bg-[#161920] border-l border-white/10 flex flex-col shadow-2xl z-20">
          <div className="h-20 flex items-center px-6 bg-[#0f1115] border-b border-white/10">
             <h2 className="font-black text-lg flex items-center gap-3"><ShoppingCart className="text-[#39ff14]"/> CHECKOUT PDV</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {venda.map(i => (
              <div key={i.id} className="bg-black/40 p-4 rounded-xl border border-white/5 relative group">
                <button onClick={() => setVenda(venda.filter(x=>x.id!==i.id))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full z-10 hover:scale-110"><Trash2 size={12}/></button>
                <div className="pr-4 mb-3"><p className="font-bold text-sm leading-tight">{i.nome}</p><p className="text-[#39ff14] font-mono mt-1 text-sm">R$ {i.preco.toFixed(2)}</p></div>
                <div className="flex items-center justify-between bg-black rounded-lg p-1 border border-white/10">
                  <button onClick={()=>upQtd(i.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                  <span className="font-bold text-sm w-8 text-center">{i.qtd}</span>
                  <button onClick={()=>upQtd(i.id, 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-[#0f1115] border-t border-white/10">
             <div className="flex justify-between items-end mb-6">
                <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">Total a pagar</span>
                <span className="text-3xl font-black text-white font-mono tracking-tighter">R$ {venda.reduce((a,i)=>a+(i.preco*i.qtd),0).toFixed(2)}</span>
             </div>
             <button disabled={venda.length===0 || loading} onClick={handleVenda} className="w-full bg-[#39ff14] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                {loading ? 'PROCESSANDO...' : <><CheckCircle2 size={20}/> EMITIR VENDA</>}
             </button>
          </div>
        </section>
      )}
    </div>
  );
}