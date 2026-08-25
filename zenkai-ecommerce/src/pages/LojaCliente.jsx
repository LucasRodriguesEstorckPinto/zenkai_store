import { useState, useEffect } from 'react';
import { ShoppingBag, X, LogOut, CheckCircle2, User, Package, MapPin, Phone, ArrowLeft, LogIn } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LojaCliente() {
  const [view, setView] = useState('vitrine'); 
  const [produtos, setProdutos] = useState([]);
  
  // VERIFICA SE O USUÁRIO ESTÁ LOGADO
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem('token'));
  
  const [carrinho, setCarrinho] = useState(() => {
    const carrinhoSalvo = localStorage.getItem('@zenkai-cart');
    return carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
  });
  
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [prodParaAdicionar, setProdParaAdicionar] = useState(null);
  
  // ESTADOS DO PERFIL
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', endereco: '' });
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // ESTADOS DE AUTENTICAÇÃO (LOGIN / CADASTRO NO CHECKOUT)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'cadastro'
  const [authForm, setAuthForm] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [loadingAuth, setLoadingAuth] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { localStorage.setItem('@zenkai-cart', JSON.stringify(carrinho)); }, [carrinho]);
  useEffect(() => { if (location.state?.abrirCarrinho) setIsCarrinhoOpen(true); }, [location]);

  const carregarDadosVitrine = async () => {
    try { setProdutos(await api.getProdutos()); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const carregarDadosPerfil = async () => {
    setLoadingPerfil(true);
    try {
      const dados = await api.getPerfil();
      setPerfilForm({ nome: dados.nome || '', telefone: dados.telefone || '', endereco: dados.endereco || '' });
      setMeusPedidos(await api.getMeusPedidos());
    } catch (err) { console.error(err); } finally { setLoadingPerfil(false); }
  };

  useEffect(() => { 
    if (view === 'vitrine') carregarDadosVitrine();
    if (view === 'perfil' && isLogged) carregarDadosPerfil();
  }, [view, isLogged]);

  // FUNÇÃO DE AUTENTICAÇÃO INTERCEPTADORA
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    try {
      if (authMode === 'login') {
        const data = await api.login(authForm.email, authForm.senha);
        
        // REDIRECIONA PARA O PDV SE FOR ADMIN
        if (data.role === 'ADMIN') {
          navigate('/pdv'); // <-- Ajuste aqui se a sua rota do PDV for diferente no App.jsx
          return;
        }
      } else {
        // FLUXO DE CRIAR CONTA E JÁ LOGAR
        await api.cadastrarCliente({ nome: authForm.nome, email: authForm.email, senha: authForm.senha, telefone: authForm.telefone, role: 'CLIENTE' });
        await api.login(authForm.email, authForm.senha);
      }
      
      setIsLogged(true);
      setShowAuthModal(false);
      setAuthForm({ nome: '', email: '', telefone: '', senha: '' });
      
      // Se ele logou com o carrinho aberto, finaliza a compra automaticamente pra ele!
      if (isCarrinhoOpen && carrinho.length > 0) {
        finalizar();
      }

    } catch (err) {
      alert(err.message || 'Erro na autenticação.');
    } finally {
      setLoadingAuth(false);
    }
  };

  const atualizarMeuPerfil = async (e) => {
    e.preventDefault();
    setLoadingPerfil(true);
    try { await api.atualizarPerfil(perfilForm); alert('Dados atualizados!'); } 
    catch (err) { alert('Erro ao atualizar: ' + err.message); } 
    finally { setLoadingPerfil(false); }
  };

  const confirmarTamanho = (prod, tamanho) => {
    const idCarrinho = `${prod.id}-${tamanho}`;
    const existe = carrinho.find(i => i.idCarrinho === idCarrinho);
    if (existe) setCarrinho(carrinho.map(i => i.idCarrinho === idCarrinho ? { ...i, qtd: i.qtd + 1 } : i));
    else setCarrinho([...carrinho, { ...prod, idCarrinho, tamanho, qtd: 1 }]);
    setProdParaAdicionar(null);
    setIsCarrinhoOpen(true);
  };

  const updateQtd = (idCarrinho, delta) => {
    setCarrinho(carrinho.map(i => { if (i.idCarrinho === idCarrinho) return { ...i, qtd: Math.max(1, i.qtd + delta) }; return i; }));
  };

  const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);

  const finalizar = async () => {
    // 1. BARREIRA DE AUTENTICAÇÃO ANTES DE COMPRAR
    if (!localStorage.getItem('token')) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    setProcessando(true);
    try {
      const token = localStorage.getItem('token');
      const tokenData = token ? JSON.parse(atob(token.split('.')[1])) : null;

      await api.checkout({
        total,
        cliente_id: tokenData?.id,
        itens: carrinho.map(i => ({ produto_id: i.id, tamanho: i.tamanho, quantidade: i.qtd, preco_unitario: i.preco }))
      });
      alert('Compra confirmada! Acompanhe o status na sua área "Minha Conta".');
      setCarrinho([]); 
      localStorage.removeItem('@zenkai-cart'); 
      setIsCarrinhoOpen(false);
      carregarDadosVitrine();
    } catch (error) {
      alert(error.message || 'Erro ao finalizar pedido.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="min-h-screen pb-10 text-white bg-[#0f1115] font-sans selection:bg-[#00e5ff]/30">
      
      <header className="sticky top-0 z-40 bg-[#0f1115]/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view === 'perfil' && (
              <button onClick={() => setView('vitrine')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-3xl font-black tracking-tighter cursor-pointer" onClick={() => setView('vitrine')}>
              ZEN<span className="text-[#00e5ff]">KAI</span>
            </h1>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* RENDERIZAÇÃO CONDICIONAL DE BOTÕES DO HEADER */}
            {isLogged ? (
              <>
                <button onClick={() => setView(view === 'vitrine' ? 'perfil' : 'vitrine')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${view === 'perfil' ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'text-gray-300 hover:bg-white/5'}`}>
                  <User size={20} /> <span className="hidden sm:block">Minha Conta</span>
                </button>
                <button onClick={() => { api.logout(); setIsLogged(false); setView('vitrine'); }} className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors">
                  <LogOut size={22} />
                </button>
              </>
            ) : (
              <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} className="flex items-center gap-2 px-5 py-2 bg-[#00e5ff] text-black font-black rounded-xl hover:bg-white transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <LogIn size={18}/> ENTRAR
              </button>
            )}
            
            <button onClick={() => setIsCarrinhoOpen(true)} className="relative p-2 text-gray-300 hover:text-[#00e5ff] transition-all bg-white/5 hover:bg-[#00e5ff]/10 rounded-xl">
              <ShoppingBag size={22} />
              {carrinho.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#00e5ff] text-black text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                  {carrinho.reduce((a, i) => a + i.qtd, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-12">
        {view === 'vitrine' ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-200">Lançamentos Exclusivos</h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-20 text-[#00e5ff] font-mono animate-pulse text-lg">SINCRONIZANDO DB...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {produtos.map(p => (
                  <div key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-[#161920] border border-white/5 rounded-2xl overflow-hidden hover:border-[#00e5ff]/30 transition-all hover:shadow-2xl hover:shadow-[#00e5ff]/5 group flex flex-col h-full cursor-pointer">
                    <div className="h-48 bg-black flex items-center justify-center overflow-hidden relative">
                       <img src={p.imagem || 'https://via.placeholder.com/200'} alt={p.nome} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>
                       {p.estoque === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="bg-red-500 text-white font-bold text-xs uppercase px-3 py-1 rounded">Esgotado</span></div>}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{p.categoria}</span>
                      <h3 className="font-bold text-lg mb-1 leading-tight flex-1">{p.nome}</h3>
                      <div className="flex justify-between items-end mt-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Grade: {p.estoque} unid.</p>
                          <p className="text-[#00e5ff] font-mono text-xl font-bold">R$ {p.preco.toFixed(2)}</p>
                        </div>
                        <button disabled={p.estoque === 0} onClick={(e) => { e.stopPropagation(); setProdParaAdicionar(p); }} className="bg-[#00e5ff]/10 text-[#00e5ff] hover:bg-[#00e5ff] hover:text-black p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10">
                          <ShoppingBag size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LADO ESQUERDO: DADOS DO PERFIL */}
            <div className="lg:col-span-1">
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 shadow-2xl">
                <h3 className="text-xl font-black mb-6 text-white flex items-center gap-2"><User className="text-[#00e5ff]"/> MEUS DADOS</h3>
                <form onSubmit={atualizarMeuPerfil} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <input required type="text" value={perfilForm.nome} onChange={e=>setPerfilForm({...perfilForm, nome: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Phone size={12}/> Telefone</label>
                    <input required type="text" value={perfilForm.telefone} onChange={e=>setPerfilForm({...perfilForm, telefone: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><MapPin size={12}/> Endereço de Entrega</label>
                    <textarea required value={perfilForm.endereco} onChange={e=>setPerfilForm({...perfilForm, endereco: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white resize-none h-24 text-sm" placeholder="Rua, Número, Bairro, CEP..." />
                  </div>
                  <button disabled={loadingPerfil} type="submit" className="w-full bg-[#00e5ff] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50 mt-4">
                    {loadingPerfil ? 'SALVANDO...' : 'ATUALIZAR DADOS'}
                  </button>
                </form>
              </div>
            </div>

            {/* LADO DIREITO: HISTÓRICO DE PEDIDOS */}
            <div className="lg:col-span-2">
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 shadow-2xl min-h-[500px]">
                <h3 className="text-xl font-black mb-6 text-white flex items-center gap-2"><Package className="text-[#00e5ff]"/> MEUS PEDIDOS</h3>
                
                {loadingPerfil ? (
                  <div className="flex items-center justify-center h-40 text-[#00e5ff] font-mono animate-pulse">CARREGANDO HISTÓRICO...</div>
                ) : meusPedidos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ShoppingBag size={48} className="opacity-20 mb-4" />
                    <p>Você ainda não realizou nenhuma compra.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meusPedidos.map(ped => (
                      <div key={ped.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-[#00e5ff]/30 transition-colors">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
                           <div>
                             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pedido <span className="text-white font-mono">#{ped.id.toString().padStart(4, '0')}</span></p>
                             <p className="text-xs text-gray-500 mt-1">{new Date(ped.data).toLocaleDateString('pt-BR')} às {new Date(ped.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                           </div>
                           <div className="text-right">
                             <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${ped.status === 'Cancelado' ? 'bg-red-500/10 text-red-500' : 'bg-[#00e5ff]/10 text-[#00e5ff]'}`}>{ped.status}</span>
                             <p className="text-[#00e5ff] font-mono font-bold mt-2">R$ {ped.total.toFixed(2)}</p>
                           </div>
                        </div>
                        <div className="space-y-2">
                          {ped.itens.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-black rounded overflow-hidden border border-white/10"><img src={item.imagem || 'https://via.placeholder.com/32'} className="w-full h-full object-cover"/></div>
                                <p className="text-gray-300"><span className="font-bold text-white">{item.qtd}x</span> {item.nome} (Tam: {item.tamanho})</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OVERLAY E GAVETA DO CARRINHO */}
      <div className={`fixed inset-0 bg-black/80 z-40 transition-opacity duration-300 ${isCarrinhoOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsCarrinhoOpen(false)} />
      
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#161920] border-l border-white/10 z-50 transform transition-transform duration-300 flex flex-col shadow-2xl ${isCarrinhoOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f1115]">
          <h2 className="font-black text-xl flex items-center gap-3 text-white"><ShoppingBag size={24} className="text-[#00e5ff]" /> SACOLA</h2>
          <button onClick={() => setIsCarrinhoOpen(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4"><ShoppingBag size={48} className="opacity-20" /><p>Sua sacola está vazia.</p></div>
          ) : (
            carrinho.map(i => (
              <div key={i.idCarrinho} className="bg-[#0f1115] p-4 rounded-2xl border border-white/5 relative group">
                <button onClick={() => setCarrinho(carrinho.filter(x => x.idCarrinho !== i.idCarrinho))} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10"><X size={14} strokeWidth={3} /></button>
                <div className="pr-6 mb-3"><p className="font-bold text-sm text-gray-200">{i.nome}</p><p className="text-xs text-gray-400 mt-1">Tam: <span className="text-white font-bold">{i.tamanho}</span></p><p className="text-[#00e5ff] font-mono text-sm mt-1">R$ {i.preco.toFixed(2)}</p></div>
                <div className="flex items-center justify-between bg-black/40 rounded-xl p-1 border border-white/5">
                  <button onClick={() => updateQtd(i.idCarrinho, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                  <span className="font-bold text-sm w-8 text-center">{i.qtd}</span>
                  <button onClick={() => updateQtd(i.idCarrinho, 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-[#0f1115] border-t border-white/10">
          <div className="flex justify-between items-center mb-6"><span className="text-gray-400 text-sm uppercase tracking-wider">Subtotal</span><span className="font-bold font-mono text-2xl text-white">R$ {total.toFixed(2)}</span></div>
          <button disabled={carrinho.length === 0 || processando} onClick={finalizar} className="w-full bg-[#00e5ff] text-black font-black py-4 rounded-xl hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2">
            {processando ? 'PROCESSANDO...' : <><CheckCircle2 size={20} /> FINALIZAR PEDIDO</>}
          </button>
        </div>
      </div>

      {/* MODAL DE TAMANHO EXPRESS */}
      {prodParaAdicionar && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setProdParaAdicionar(null)}>
          <div className="bg-[#161920] border border-[#00e5ff]/20 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,229,255,0.1)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6"><div><h3 className="font-bold text-lg leading-tight">{prodParaAdicionar.nome}</h3><p className="text-[#00e5ff] font-mono mt-1">R$ {prodParaAdicionar.preco.toFixed(2)}</p></div><button onClick={() => setProdParaAdicionar(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full"><X size={16}/></button></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Escolha o Tamanho</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(prodParaAdicionar.tamanhos).map(([tam, qtd]) => (
                <button key={tam} disabled={qtd === 0} onClick={() => confirmarTamanho(prodParaAdicionar, tam)} className="py-3 rounded-xl border border-white/10 font-mono font-bold hover:border-[#00e5ff] hover:text-[#00e5ff] hover:bg-[#00e5ff]/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed bg-black/50">{tam}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUTENTICAÇÃO (LOGIN / CADASTRO) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-[#161920] border border-[#00e5ff]/30 p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,229,255,0.1)] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={20}/></button>
            
            <div className="flex justify-center gap-6 mb-8 border-b border-white/10 pb-4">
              <button onClick={() => setAuthMode('login')} className={`font-black text-lg transition-colors ${authMode === 'login' ? 'text-[#00e5ff]' : 'text-gray-500 hover:text-gray-300'}`}>LOGIN</button>
              <button onClick={() => setAuthMode('cadastro')} className={`font-black text-lg transition-colors ${authMode === 'cadastro' ? 'text-[#00e5ff]' : 'text-gray-500 hover:text-gray-300'}`}>CRIAR CONTA</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'cadastro' && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                  <input required type="text" value={authForm.nome} onChange={e=>setAuthForm({...authForm, nome: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white" />
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                <input required type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm, email: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white" />
              </div>

              {authMode === 'cadastro' && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Telefone / WhatsApp</label>
                  <input required type="text" value={authForm.telefone} onChange={e=>setAuthForm({...authForm, telefone: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white font-mono" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
                <input required type="password" value={authForm.senha} onChange={e=>setAuthForm({...authForm, senha: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white" />
              </div>

              <button disabled={loadingAuth} type="submit" className="w-full bg-[#00e5ff] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50 mt-6 shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)]">
                {loadingAuth ? 'AGUARDE...' : (authMode === 'login' ? 'ACESSAR MINHA CONTA' : 'FINALIZAR CADASTRO')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}