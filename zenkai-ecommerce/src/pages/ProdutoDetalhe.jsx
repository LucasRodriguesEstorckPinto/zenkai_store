import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);

  useEffect(() => {
    const carregarProduto = async () => {
      try {
        setProduto(await api.getProduto(id));
      } catch (err) {
        alert('Produto não encontrado!');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    carregarProduto();
  }, [id, navigate]);

  if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#00e5ff] font-mono animate-pulse text-xl">CARREGANDO...</div>;
  if (!produto) return null;

  // LÓGICA DE INSERÇÃO NO STORAGE DO NAVEGADOR
  const handleAddCarrinho = () => {
    const carrinhoSalvo = localStorage.getItem('@zenkai-cart');
    let carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
    
    const idCarrinho = `${produto.id}-${tamanhoSelecionado}`;
    const existe = carrinho.find(i => i.idCarrinho === idCarrinho);
    
    if (existe) {
      carrinho = carrinho.map(i => i.idCarrinho === idCarrinho ? { ...i, qtd: i.qtd + 1 } : i);
    } else {
      carrinho.push({ ...produto, idCarrinho, tamanho: tamanhoSelecionado, qtd: 1 });
    }
    
    localStorage.setItem('@zenkai-cart', JSON.stringify(carrinho));
    
    // Retorna para a home e passa um sinal para a LojaCliente abrir a gaveta
    navigate(-1, { state: { abrirCarrinho: true } });
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <header className="border-b border-white/10 bg-[#161920]">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tighter">ZEN<span className="text-[#00e5ff]">KAI</span></h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          <div className="bg-[#161920] rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center h-[500px] shadow-2xl relative">
            <span className="absolute top-6 left-6 bg-black/60 backdrop-blur px-4 py-1 rounded-full text-xs font-bold text-gray-300 uppercase tracking-widest border border-white/10">
              {produto.categoria}
            </span>
            <img src={produto.imagem || 'https://via.placeholder.com/500'} alt={produto.nome} className="w-full h-full object-cover"/>
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-black mb-4 leading-tight">{produto.nome}</h1>
            
            <div className="mb-8">
              <p className="text-[#00e5ff] font-mono text-4xl font-bold mb-2">R$ {produto.preco.toFixed(2)}</p>
            </div>

            <div className="mb-8">
               <div className="flex justify-between items-end mb-3">
                 <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase">Selecione o Tamanho</h3>
                 {tamanhoSelecionado && (
                   <span className="text-xs text-[#00e5ff] font-mono">Restam {produto.tamanhos[tamanhoSelecionado]} unid.</span>
                 )}
               </div>
               <div className="flex flex-wrap gap-3">
                 {Object.entries(produto.tamanhos).map(([tam, qtd]) => {
                   const isSelected = tamanhoSelecionado === tam;
                   const isEsgotado = qtd === 0;
                   return (
                     <button
                       key={tam}
                       disabled={isEsgotado}
                       onClick={() => setTamanhoSelecionado(tam)}
                       className={`
                         h-12 min-w-[3rem] px-4 rounded-xl font-mono font-bold text-lg border transition-all
                         ${isSelected ? 'bg-[#00e5ff] border-[#00e5ff] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/30 text-gray-300'}
                         ${isEsgotado ? 'opacity-20 cursor-not-allowed' : ''}
                       `}
                     >
                       {tam}
                     </button>
                   );
                 })}
               </div>
            </div>

            <div className="bg-[#161920] p-6 rounded-2xl border border-white/5 mb-8">
              <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-3 border-b border-white/10 pb-2">Descrição</h3>
              <p className="text-gray-300 leading-relaxed text-sm">{produto.descricao || "Nenhuma descrição."}</p>
            </div>

            <button 
              disabled={!tamanhoSelecionado}
              onClick={handleAddCarrinho}
              className="w-full bg-[#00e5ff] text-black font-black py-5 rounded-xl hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3 text-lg"
            >
              <ShoppingBag size={24} /> 
              {tamanhoSelecionado ? `ADICIONAR TAMANHO ${tamanhoSelecionado}` : 'SELECIONE UM TAMANHO'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}