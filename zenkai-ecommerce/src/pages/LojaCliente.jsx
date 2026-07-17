import { useState, useEffect } from 'react';
import { ShoppingBag, X, MapPin, Truck, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';

export default function LojaCliente() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processandoCheckout, setProcessandoCheckout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const dados = await api.getProdutos();
        setProdutos(dados);
      } catch(err) {
        console.error("Erro ao carregar produtos", err);
      } finally {
        setLoading(false);
      }
    }
    carregarProdutos();
  }, []);

  // --- NOVAS FUNÇÕES DO CARRINHO ---
  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(item => 
        item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
      ));
    } else {
      const novoItem = { ...produto, idCarrinho: Date.now(), tipoEntrega: 'casa', quantidade: 1 };
      setCarrinho([...carrinho, novoItem]);
    }
    setIsCarrinhoOpen(true);
  };

  const alterarQuantidade = (idCarrinho, delta) => {
    setCarrinho(carrinho.map(item => {
      if (item.idCarrinho === idCarrinho) {
        const novaQtd = item.quantidade + delta;
        return { ...item, quantidade: novaQtd > 0 ? novaQtd : 1 }; // Impede que a quantidade fique menor que 1
      }
      return item;
    }));
  };

  const removerDoCarrinho = (idCarrinho) => {
    setCarrinho(carrinho.filter(item => item.idCarrinho !== idCarrinho));
  };

  const alterarTipoEntrega = (idCarrinho, tipo) => {
    setCarrinho(carrinho.map(item => 
      item.idCarrinho === idCarrinho ? { ...item, tipoEntrega: tipo } : item
    ));
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  // --- LÓGICA DE CHECKOUT ---
  const handleFinalizarCompra = async () => {
    setProcessandoCheckout(true);
    try {
      const pedido = {
        total: totalCarrinho,
        itens: carrinho.map(item => ({
          produto_id: item.id,
          quantidade: item.quantidade, // Agora envia a quantidade real para o banco
          tipo_entrega: item.tipoEntrega,
          preco_unitario: item.preco
        }))
      };

      await api.checkout(pedido);
      
      alert('Compra finalizada com sucesso! Seu pedido foi registrado no sistema.');
      setCarrinho([]); 
      setIsCarrinhoOpen(false); 
    } catch (error) {
      alert('Erro ao processar a compra: Verifique se você está logado!');
    } finally {
      setProcessandoCheckout(false);
    }
  };

  return (
    <div className="min-h-screen pb-10 text-white bg-zenkai-bg">
      <header className="sticky top-0 z-40 bg-zenkai-bg/95 backdrop-blur-sm border-b border-zenkai-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tighter">
            ZEN<span className="text-zenkai-neonBlue">KAI</span>
          </h1>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setIsCarrinhoOpen(true)}
              className="relative p-2 text-zenkai-textMain hover:text-zenkai-neonBlue transition-colors"
            >
              <ShoppingBag size={24} />
              {carrinho.length > 0 && (
                <span className="absolute top-0 right-0 bg-zenkai-neonBlue text-black text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                  {carrinho.reduce((acc, item) => acc + item.quantidade, 0)}
                </span>
              )}
            </button>
            <button onClick={() => { api.logout(); navigate('/'); }} className="text-red-400 hover:text-red-500">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        <h2 className="text-xl font-bold mb-6 text-zenkai-textMuted">Lançamentos</h2>
        
        {loading ? (
          <div className="text-center text-zenkai-neonBlue py-20 font-mono animate-pulse">
            CARREGANDO SISTEMA...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtos.map(produto => (
              <ProductCard 
                key={produto.id} 
                produto={produto} 
                onAdicionar={adicionarAoCarrinho} 
              />
            ))}
          </div>
        )}
      </main>

      {isCarrinhoOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setIsCarrinhoOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-zenkai-surface border-l border-zenkai-border z-50 transform transition-transform duration-300 flex flex-col ${isCarrinhoOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-16 border-b border-zenkai-border flex items-center justify-between px-6 bg-zenkai-bg">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag size={20} className="text-zenkai-neonBlue" /> Seu Carrinho
          </h2>
          <button onClick={() => setIsCarrinhoOpen(false)} className="text-zenkai-textMuted hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {carrinho.length === 0 ? (
            <p className="text-center text-zenkai-textMuted mt-10">Seu carrinho está vazio.</p>
          ) : (
            carrinho.map((item) => (
              <div key={item.idCarrinho} className="bg-zenkai-bg p-4 rounded-xl border border-zenkai-border relative group">
                
                {/* Botão de Excluir */}
                <button 
                  onClick={() => removerDoCarrinho(item.idCarrinho)}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={14} />
                </button>

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-sm pr-4">{item.nome}</p>
                    <p className="text-zenkai-neonBlue font-mono text-sm mt-1">R$ {item.preco.toFixed(2)}</p>
                  </div>
                </div>

                {/* Controles de Quantidade */}
                <div className="flex items-center justify-between mt-3 mb-3">
                  <span className="text-xs text-zenkai-textMuted">Quantidade:</span>
                  <div className="flex items-center gap-3 bg-black/40 rounded-lg px-2 py-1 border border-zenkai-border">
                    <button onClick={() => alterarQuantidade(item.idCarrinho, -1)} className="text-zenkai-textMuted hover:text-white px-1">-</button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantidade}</span>
                    <button onClick={() => alterarQuantidade(item.idCarrinho, 1)} className="text-zenkai-textMuted hover:text-white px-1">+</button>
                  </div>
                </div>

                <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-zenkai-border">
                  <button
                    onClick={() => alterarTipoEntrega(item.idCarrinho, 'casa')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${item.tipoEntrega === 'casa' ? 'bg-zenkai-surface text-zenkai-neonBlue border border-zenkai-border' : 'text-zenkai-textMuted'}`}
                  >
                    <Truck size={14} /> Entregar
                  </button>
                  <button
                    onClick={() => alterarTipoEntrega(item.idCarrinho, 'loja')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${item.tipoEntrega === 'loja' ? 'bg-zenkai-surface text-zenkai-neonBlue border border-zenkai-border' : 'text-zenkai-textMuted'}`}
                  >
                    <MapPin size={14} /> Retirar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-zenkai-border p-6 bg-zenkai-bg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zenkai-textMuted">Total estimado</span>
            <span className="font-bold font-mono text-xl">R$ {totalCarrinho.toFixed(2)}</span>
          </div>
          <button 
            disabled={carrinho.length === 0 || processandoCheckout}
            onClick={handleFinalizarCompra}
            className="w-full bg-zenkai-neonBlue text-black font-bold py-3 rounded-lg hover:bg-[#00c8ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processandoCheckout ? 'Processando...' : 'Finalizar Compra'}
          </button>
        </div>
      </div>
    </div>
  );
}