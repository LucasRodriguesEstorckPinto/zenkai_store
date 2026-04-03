// src/pages/LojaCliente.jsx
import { useState, useEffect } from 'react';
import { ShoppingBag, X, MapPin, Truck } from 'lucide-react';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard.jsx';

export default function LojaCliente() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Busca os produtos ao carregar a tela
  useEffect(() => {
    async function carregarProdutos() {
      const dados = await api.getProdutos();
      setProdutos(dados);
      setLoading(false);
    }
    carregarProdutos();
  }, []);

  // Adiciona o item com um tipo de entrega padrão
  const adicionarAoCarrinho = (produto) => {
    const novoItem = { ...produto, idCarrinho: Date.now(), tipoEntrega: 'casa' };
    setCarrinho([...carrinho, novoItem]);
    setIsCarrinhoOpen(true); // Abre o carrinho automaticamente
  };

  // Altera o método (Retirada vs Entrega) para um item específico
  const alterarTipoEntrega = (idCarrinho, tipo) => {
    setCarrinho(carrinho.map(item => 
      item.idCarrinho === idCarrinho ? { ...item, tipoEntrega: tipo } : item
    ));
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.preco, 0);

  return (
    <div className="min-h-screen pb-10">
      
      {/* Navbar (Fixa no topo) */}
      <header className="sticky top-0 z-40 bg-zenkai-bg/95 backdrop-blur-sm border-b border-zenkai-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tighter">
            ZEN<span className="text-zenkai-neonBlue">KAI</span>
          </h1>
          <button 
            onClick={() => setIsCarrinhoOpen(true)}
            className="relative p-2 text-zenkai-textMain hover:text-zenkai-neonBlue transition-colors"
          >
            <ShoppingBag size={24} />
            {carrinho.length > 0 && (
              <span className="absolute top-0 right-0 bg-zenkai-neonBlue text-black text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                {carrinho.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Grid de Produtos */}
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

      {/* Drawer do Carrinho (Slide-out) */}
      {/* Fundo escuro atrás do carrinho */}
      {isCarrinhoOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setIsCarrinhoOpen(false)}
        />
      )}

      {/* Painel lateral do carrinho */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-zenkai-surface border-l border-zenkai-border z-50 transform transition-transform duration-300 flex flex-col ${isCarrinhoOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header do Carrinho */}
        <div className="h-16 border-b border-zenkai-border flex items-center justify-between px-6 bg-zenkai-bg">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag size={20} className="text-zenkai-neonBlue" /> Seu Carrinho
          </h2>
          <button onClick={() => setIsCarrinhoOpen(false)} className="text-zenkai-textMuted hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {carrinho.length === 0 ? (
            <p className="text-center text-zenkai-textMuted mt-10">Seu carrinho está vazio.</p>
          ) : (
            carrinho.map((item) => (
              <div key={item.idCarrinho} className="bg-zenkai-bg p-4 rounded-xl border border-zenkai-border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-sm">{item.nome}</p>
                    <p className="text-zenkai-neonBlue font-mono text-sm mt-1">R$ {item.preco.toFixed(2)}</p>
                  </div>
                </div>

                {/* Opções Omnichannel (O diferencial do Phygital) */}
                <div className="flex gap-2 mt-4 bg-black/40 p-1 rounded-lg border border-zenkai-border">
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

        {/* Footer do Checkout */}
        <div className="border-t border-zenkai-border p-6 bg-zenkai-bg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zenkai-textMuted">Total estimado</span>
            <span className="font-bold font-mono text-xl">R$ {totalCarrinho.toFixed(2)}</span>
          </div>
          <button 
            disabled={carrinho.length === 0}
            className="w-full bg-zenkai-neonBlue text-black font-bold py-3 rounded-lg hover:bg-[#00c8ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Finalizar Compra
          </button>
        </div>
      </div>

    </div>
  );
}