import { useState, useEffect } from 'react';
import { ShoppingBag, X, LogOut, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LojaCliente() {
  const [produtos, setProdutos] = useState([]);
  
  // INICIALIZA O CARRINHO COM OS DADOS SALVOS NO NAVEGADOR
  const [carrinho, setCarrinho] = useState(() => {
    const carrinhoSalvo = localStorage.getItem('@zenkai-cart');
    return carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
  });
  
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  
  const [prodParaAdicionar, setProdParaAdicionar] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // SALVA O CARRINHO AUTOMATICAMENTE NO NAVEGADOR SEMPRE QUE SOFRER ALTERAÇÃO
  useEffect(() => {
    localStorage.setItem('@zenkai-cart', JSON.stringify(carrinho));
  }, [carrinho]);

  // ABRE O CARRINHO AUTOMATICAMENTE SE VOLTAR DA TELA DE DETALHES
  useEffect(() => {
    if (location.state?.abrirCarrinho) setIsCarrinhoOpen(true);
  }, [location]);

  const carregarDados = async () => {
    try {
      const dados = await api.getProdutos();
      setProdutos(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const confirmarTamanho = (prod, tamanho) => {
    const idCarrinho = `${prod.id}-${tamanho}`;
    const existe = carrinho.find(i => i.idCarrinho === idCarrinho);
    
    if (existe) {
      setCarrinho(carrinho.map(i => i.idCarrinho === idCarrinho ? { ...i, qtd: i.qtd + 1 } : i));
    } else {
      setCarrinho([...carrinho, { ...prod, idCarrinho, tamanho, qtd: 1 }]);
    }
    setProdParaAdicionar(null);
    setIsCarrinhoOpen(true);
  };

  const updateQtd = (idCarrinho, delta) => {
    setCarrinho(carrinho.map(i => {
      if (i.idCarrinho === idCarrinho) {
        const n = i.qtd + delta;
        return { ...i, qtd: n > 0 ? n : 1 };
      }
      return i;
    }));
  };

  const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);

  const finalizar = async () => {
    setProcessando(true);
    try {
      await api.checkout({
        total,
        itens: carrinho.map(i => ({ produto_id: i.id, tamanho: i.tamanho, quantidade: i.qtd, preco_unitario: i.preco }))
      });
      alert('Sucesso! Transação registrada na Blockchain da loja.');
      setCarrinho([]); // Esvazia o carrinho
      localStorage.removeItem('@zenkai-cart'); // Limpa o cache do navegador
      setIsCarrinhoOpen(false);
      carregarDados();
    } catch (error) {
      alert(error.message || 'Erro ao finalizar pedido.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="min-h-screen pb-10 text-white bg-[#0f1115]">
      <header className="sticky top-0 z-40 bg-[#0f1115]/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter">
            ZEN<span className="text-[#00e5ff]">KAI</span>
          </h1>
          <div className="flex gap-6 items-center">
            <button onClick={() => setIsCarrinhoOpen(true)} className="relative p-2 text-gray-300 hover:text-[#00e5ff] transition-all">
              <ShoppingBag size={26} />
              {carrinho.length > 0 && (
                <span className="absolute top-0 right-0 bg-[#00e5ff] text-black text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center transform translate-x-2 -translate-y-1 shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                  {carrinho.reduce((a, i) => a + i.qtd, 0)}
                </span>
              )}
            </button>
            <button onClick={() => { api.logout(); navigate('/'); }} className="text-red-400 hover:text-red-500 transition-colors p-2">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-200">Lançamentos Exclusivos</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20 text-[#00e5ff] font-mono animate-pulse text-lg">SINCRONIZANDO DB...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {produtos.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate(`/produto/${p.id}`)}
                className="bg-[#161920] border border-white/5 rounded-2xl overflow-hidden hover:border-[#00e5ff]/30 transition-all hover:shadow-2xl hover:shadow-[#00e5ff]/5 group flex flex-col h-full cursor-pointer"
              >
                <div className="h-48 bg-black flex items-center justify-center overflow-hidden">
                   <img src={p.imagem || 'https://via.placeholder.com/200'} alt={p.nome} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{p.categoria}</span>
                  <h3 className="font-bold text-lg mb-1 leading-tight flex-1">{p.nome}</h3>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total Disp: {p.estoque}</p>
                      <p className="text-[#00e5ff] font-mono text-xl font-bold">R$ {p.preco.toFixed(2)}</p>
                    </div>
                    <button 
                      disabled={p.estoque === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProdParaAdicionar(p);
                      }} 
                      className="bg-[#00e5ff]/10 text-[#00e5ff] hover:bg-[#00e5ff] hover:text-black p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                    >
                      <ShoppingBag size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* OVERLAY E GAVETA DO CARRINHO */}
      <div className={`fixed inset-0 bg-black/80 z-50 transition-opacity duration-300 ${isCarrinhoOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsCarrinhoOpen(false)} />
      
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#161920] border-l border-white/10 z-50 transform transition-transform duration-300 flex flex-col shadow-2xl ${isCarrinhoOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f1115]">
          <h2 className="font-black text-xl flex items-center gap-3 text-white">
            <ShoppingBag size={24} className="text-[#00e5ff]" /> SACOLA
          </h2>
          <button onClick={() => setIsCarrinhoOpen(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <ShoppingBag size={48} className="opacity-20" />
              <p>Sua sacola está vazia.</p>
            </div>
          ) : (
            carrinho.map(i => (
              <div key={i.idCarrinho} className="bg-[#0f1115] p-4 rounded-2xl border border-white/5 relative group">
                <button 
                  onClick={() => setCarrinho(carrinho.filter(x => x.idCarrinho !== i.idCarrinho))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                >
                  <X size={14} strokeWidth={3} />
                </button>
                <div className="pr-6 mb-3">
                  <p className="font-bold text-sm text-gray-200">{i.nome}</p>
                  <p className="text-xs text-gray-400 mt-1">Tam: <span className="text-white font-bold">{i.tamanho}</span></p>
                  <p className="text-[#00e5ff] font-mono text-sm mt-1">R$ {i.preco.toFixed(2)}</p>
                </div>
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
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-400 text-sm uppercase tracking-wider">Subtotal</span>
            <span className="font-bold font-mono text-2xl text-white">R$ {total.toFixed(2)}</span>
          </div>
          <button 
            disabled={carrinho.length === 0 || processando} onClick={finalizar}
            className="w-full bg-[#00e5ff] text-black font-black py-4 rounded-xl hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            {processando ? 'PROCESSANDO...' : <><CheckCircle2 size={20} /> FINALIZAR PEDIDO</>}
          </button>
        </div>
      </div>

      {/* MODAL DE TAMANHO EXPRESS CLIENTE */}
      {prodParaAdicionar && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setProdParaAdicionar(null)}>
          <div className="bg-[#161920] border border-[#00e5ff]/20 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,229,255,0.1)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg leading-tight">{prodParaAdicionar.nome}</h3>
                <p className="text-[#00e5ff] font-mono mt-1">R$ {prodParaAdicionar.preco.toFixed(2)}</p>
              </div>
              <button onClick={() => setProdParaAdicionar(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full"><X size={16}/></button>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Escolha o Tamanho</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(prodParaAdicionar.tamanhos).map(([tam, qtd]) => (
                <button 
                  key={tam} 
                  disabled={qtd === 0}
                  onClick={() => confirmarTamanho(prodParaAdicionar, tam)}
                  className="py-3 rounded-xl border border-white/10 font-mono font-bold hover:border-[#00e5ff] hover:text-[#00e5ff] hover:bg-[#00e5ff]/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed bg-black/50"
                >
                  {tam}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}