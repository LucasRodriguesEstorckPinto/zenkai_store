import { useState, useEffect } from 'react';
import { ShoppingBag, X, LogOut, CheckCircle2, User, Package, MapPin, Phone, ArrowLeft, LogIn, Truck, Store } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LojaCliente() {
  const [view, setView] = useState('vitrine'); 
  const [produtos, setProdutos] = useState([]);
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem('token'));
  
  const [carrinho, setCarrinho] = useState(() => {
    const carrinhoSalvo = localStorage.getItem('@zenkai-cart');
    return carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
  });
  
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [prodParaAdicionar, setProdParaAdicionar] = useState(null);
  
  // ESTADOS DE FRETE NO CARRINHO
  const [tipoEntrega, setTipoEntrega] = useState('retirada');
  const [cepCalc, setCepCalc] = useState('');
  const [valorFrete, setValorFrete] = useState(0);
  const [loadingFrete, setLoadingFrete] = useState(false); // NOVO ESTADO

  // ESTADOS DO PERFIL
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', endereco: '' });
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // ESTADOS DE AUTENTICAÇÃO (Cadastro de Endereço)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ nome: '', email: '', telefone: '', senha: '', cep: '', enderecoDetalhado: '' });
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

  // CALCULAR VALORES DO CARRINHO
  const totalItens = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
  const totalFinal = totalItens + valorFrete;

  // NOVA FUNÇÃO: SIMULAR FRETE COM VIACEP
  const simularFrete = async () => {
    if (cepCalc.length !== 8) {
      return alert('Por favor, digite um CEP válido com 8 números (somente números).');
    }

    setLoadingFrete(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepCalc}/json/`);
      const data = await response.json();

      if (data.erro) {
        alert('CEP não localizado nas bases dos Correios.');
        setValorFrete(0);
        return;
      }

      // Regra de Negócio baseada na região (Sede no RJ)
      let precoCalculado = 35.90; // Padrão Nacional
      
      if (data.uf === 'RJ') {
        precoCalculado = 15.90; // Frete Local
      } else if (['SP', 'MG', 'ES'].includes(data.uf)) {
        precoCalculado = 22.90; // Frete Regional (Sudeste)
      }

      setValorFrete(precoCalculado);
      
      // Atualiza o endereço detalhado do cliente automaticamente se for para criar conta
      if (authMode === 'cadastro') {
        setAuthForm(prev => ({ 
          ...prev, 
          enderecoDetalhado: `${data.logradouro}, Bairro ${data.bairro}, ${data.localidade} - ${data.uf}` 
        }));
      }

      alert(`Entrega para: ${data.localidade} - ${data.uf}\nValor do Frete: R$ ${precoCalculado.toFixed(2)}`);

    } catch (error) {
      alert('Serviço de cálculo de frete indisponível no momento.');
    } finally {
      setLoadingFrete(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    try {
      if (authMode === 'login') {
        const data = await api.login(authForm.email, authForm.senha);
        if (data.role === 'ADMIN') {
          navigate('/pdv');
          return;
        }
      } else {
        const enderecoCompleto = `CEP: ${authForm.cep} | ${authForm.enderecoDetalhado}`;
        await api.cadastrarCliente({ 
          nome: authForm.nome, 
          email: authForm.email, 
          senha: authForm.senha, 
          telefone: authForm.telefone, 
          endereco: enderecoCompleto,
          role: 'CLIENTE' 
        });
        await api.login(authForm.email, authForm.senha);
      }
      
      setIsLogged(true);
      setShowAuthModal(false);
      setAuthForm({ nome: '', email: '', telefone: '', senha: '', cep: '', enderecoDetalhado: '' });
      
      if (isCarrinhoOpen && carrinho.length > 0) finalizar();
    } catch (err) { alert(err.message || 'Erro na autenticação.'); } 
    finally { setLoadingAuth(false); }
  };

  const atualizarMeuPerfil = async (e) => {
    e.preventDefault();
    setLoadingPerfil(true);
    try { await api.atualizarPerfil(perfilForm); alert('Dados atualizados!'); } 
    catch (err) { alert('Erro ao atualizar: ' + err.message); } 
    finally { setLoadingPerfil(false); }
  };

  const updateQtd = (idCarrinho, delta) => {
    setCarrinho(carrinho.map(i => { if (i.idCarrinho === idCarrinho) return { ...i, qtd: Math.max(1, i.qtd + delta) }; return i; }));
  };

  const finalizar = async () => {
    if (!localStorage.getItem('token')) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    if (tipoEntrega === 'entrega' && valorFrete === 0) {
      alert("Por favor, calcule o frete antes de finalizar o pedido.");
      return;
    }

    setProcessando(true);
    try {
      const token = localStorage.getItem('token');
      const tokenData = token ? JSON.parse(atob(token.split('.')[1])) : null;

      await api.checkout({
        total: totalFinal, 
        cliente_id: tokenData?.id,
        itens: carrinho.map(i => ({ produto_id: i.id, cor: i.cor, tamanho: i.tamanho, quantidade: i.qtd, preco_unitario: i.preco }))
      });
      
      alert('Compra confirmada! Acompanhe o status na sua área "Minha Conta".');
      setCarrinho([]); 
      localStorage.removeItem('@zenkai-cart'); 
      setIsCarrinhoOpen(false);
      setValorFrete(0);
      carregarDadosVitrine();
    } catch (error) { alert(error.message || 'Erro ao finalizar pedido.'); } 
    finally { setProcessando(false); }
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
                          <p className="text-[#00e5ff] font-mono text-xl font-bold">R$ {p.preco.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                                <div className="w-10 h-10 bg-black rounded overflow-hidden border border-white/10"><img src={item.imagem || 'https://via.placeholder.com/40'} className="w-full h-full object-cover"/></div>
                                <p className="text-gray-300"><span className="font-bold text-white">{item.qtd}x</span> {item.nome} <br/><span className="text-xs text-gray-500">Cor: {item.cor} | Tam: {item.tamanho}</span></p>
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

      {/* GAVETA DO CARRINHO */}
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
              <div key={i.idCarrinho} className="bg-[#0f1115] p-3 rounded-2xl border border-white/5 relative group flex gap-4">
                <button onClick={() => setCarrinho(carrinho.filter(x => x.idCarrinho !== i.idCarrinho))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-10"><X size={12} strokeWidth={3} /></button>
                
                <div className="w-20 h-20 bg-black rounded-xl border border-white/10 overflow-hidden flex-shrink-0">
                  <img src={i.imagemVariante || i.imagem || 'https://via.placeholder.com/80'} alt={i.nome} className="w-full h-full object-cover"/>
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <p className="font-bold text-sm text-gray-200 leading-tight">{i.nome}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{i.cor} | {i.tamanho}</p>
                  </div>
                  <div className="flex justify-between items-center">
                     <p className="text-[#00e5ff] font-mono text-sm font-bold">R$ {i.preco.toFixed(2)}</p>
                     <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                        <button onClick={() => updateQtd(i.idCarrinho, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                        <span className="font-bold text-xs w-6 text-center">{i.qtd}</span>
                        <button onClick={() => updateQtd(i.idCarrinho, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white">+</button>
                     </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-[#0f1115] border-t border-white/10">
          
          {/* SIMULADOR DE FRETE */}
          <div className="mb-6">
             <p className="text-gray-400 text-xs font-bold uppercase mb-3 border-b border-white/10 pb-2">Opções de Entrega</p>
             <div className="flex gap-2 mb-3">
                <button onClick={() => { setTipoEntrega('retirada'); setValorFrete(0); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${tipoEntrega === 'retirada' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/50' : 'bg-[#161920] border-white/10 text-gray-400 hover:bg-white/5'}`}><Store size={14}/> Retirada Loja</button>
                <button onClick={() => setTipoEntrega('entrega')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${tipoEntrega === 'entrega' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/50' : 'bg-[#161920] border-white/10 text-gray-400 hover:bg-white/5'}`}><Truck size={14}/> Correios</button>
             </div>

             {tipoEntrega === 'entrega' && (
                <div className="flex gap-2 animate-in slide-in-from-top-2">
                   <input type="text" placeholder="CEP (Ex: 28600000)" value={cepCalc} onChange={e=>setCepCalc(e.target.value.replace(/\D/g, ''))} maxLength={8} className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00e5ff] outline-none font-mono" />
                   <button disabled={loadingFrete} onClick={simularFrete} className="bg-white/10 hover:bg-[#00e5ff] hover:text-black transition-colors px-4 rounded-xl text-xs font-bold disabled:opacity-50">
                     {loadingFrete ? 'CALCULANDO...' : 'CALCULAR'}
                   </button>
                </div>
             )}
          </div>

          <div className="space-y-2 mb-6 border-t border-white/10 pt-4">
              <div className="flex justify-between items-center text-gray-400 text-sm"><span>Subtotal</span><span className="font-mono">R$ {totalItens.toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-gray-400 text-sm"><span>Frete</span><span className="font-mono">{valorFrete === 0 ? 'Grátis' : `R$ ${valorFrete.toFixed(2)}`}</span></div>
              <div className="flex justify-between items-end mt-2 pt-2 border-t border-white/5"><span className="text-gray-200 text-xs font-bold uppercase tracking-widest mb-1">Total do Pedido</span><span className="font-black font-mono text-3xl text-[#00e5ff]">R$ {totalFinal.toFixed(2)}</span></div>
          </div>

          <button disabled={carrinho.length === 0 || processando} onClick={finalizar} className="w-full bg-[#00e5ff] text-black font-black py-4 rounded-xl hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 text-lg">
            {processando ? 'PROCESSANDO...' : <><CheckCircle2 size={20} /> FINALIZAR PEDIDO</>}
          </button>
        </div>
      </div>

      {/* MODAL DE AUTENTICAÇÃO (LOGIN / CADASTRO COM ENDEREÇO) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-[#161920] border border-[#00e5ff]/30 p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,229,255,0.1)] relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={20}/></button>
            
            <div className="flex justify-center gap-6 mb-8 border-b border-white/10 pb-4">
              <button onClick={() => setAuthMode('login')} className={`font-black text-lg transition-colors ${authMode === 'login' ? 'text-[#00e5ff]' : 'text-gray-500 hover:text-gray-300'}`}>LOGIN</button>
              <button onClick={() => setAuthMode('cadastro')} className={`font-black text-lg transition-colors ${authMode === 'cadastro' ? 'text-[#00e5ff]' : 'text-gray-500 hover:text-gray-300'}`}>CRIAR CONTA</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'cadastro' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome Completo</label>
                  <input required type="text" value={authForm.nome} onChange={e=>setAuthForm({...authForm, nome: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white text-sm" />
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                <input required type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm, email: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white text-sm" />
              </div>

              {authMode === 'cadastro' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Telefone / WhatsApp</label>
                    <input required type="text" value={authForm.telefone} onChange={e=>setAuthForm({...authForm, telefone: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white font-mono text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4 mt-2">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-[#00e5ff] uppercase">CEP</label>
                      <input required type="text" placeholder="00000000" maxLength={8} value={authForm.cep} onChange={e=>setAuthForm({...authForm, cep: e.target.value.replace(/\D/g, '')})} className="w-full mt-1 p-3 bg-black border border-[#00e5ff]/30 rounded-xl focus:border-[#00e5ff] outline-none text-[#00e5ff] font-mono text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Endereço Completo</label>
                      <input required type="text" placeholder="Rua, Número, Bairro, Cidade" value={authForm.enderecoDetalhado} onChange={e=>setAuthForm({...authForm, enderecoDetalhado: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white text-sm" />
                    </div>
                  </div>
                </>
              )}

              <div className={authMode === 'cadastro' ? "pt-4 border-t border-white/5" : ""}>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Senha</label>
                <input required type="password" value={authForm.senha} onChange={e=>setAuthForm({...authForm, senha: e.target.value})} className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#00e5ff] outline-none text-white text-sm" />
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