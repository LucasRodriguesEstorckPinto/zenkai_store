import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [corSelecionada, setCorSelecionada] = useState(null);
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

  const coresDisponiveis = useMemo(() => {
    if (!produto?.variantes) return [];
    return [...new Set(produto.variantes.map(v => v.Cor))];
  }, [produto]);

  const tamanhosDaCor = useMemo(() => {
    if (!produto?.variantes || !corSelecionada) return [];
    return produto.variantes.filter(v => v.Cor === corSelecionada);
  }, [produto, corSelecionada]);

  useEffect(() => { setTamanhoSelecionado(null); }, [corSelecionada]);

  if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#00e5ff] font-mono animate-pulse text-xl">CARREGANDO...</div>;
  if (!produto) return null;

  const varianteSelecionada = tamanhosDaCor.find(v => v.Tamanho === tamanhoSelecionado);
  const estoqueVarianteAtual = varianteSelecionada ? varianteSelecionada.Quantidade_Estoque : null;

  // LÓGICA DA IMAGEM DINÂMICA:
  // Procura se a cor selecionada possui uma imagem específica. Se não, usa a foto de capa.
  const imagemVarianteCor = produto.variantes?.find(v => v.Cor === corSelecionada)?.Imagem;
  const imagemExibida = imagemVarianteCor || produto.imagem || 'https://via.placeholder.com/500';

  const handleAddCarrinho = () => {
    const carrinhoSalvo = localStorage.getItem('@zenkai-cart');
    let carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
    
    const idCarrinho = `${produto.id}-${corSelecionada}-${tamanhoSelecionado}`;
    const existe = carrinho.find(i => i.idCarrinho === idCarrinho);
    
    if (existe) {
      carrinho = carrinho.map(i => i.idCarrinho === idCarrinho ? { ...i, qtd: i.qtd + 1 } : i);
    } else {
      carrinho.push({ 
        ...produto, 
        idCarrinho, 
        cor: corSelecionada, 
        tamanho: tamanhoSelecionado, 
        qtd: 1,
        imagemVariante: imagemExibida // Gravamos a imagem da cor escolhida no carrinho
      });
    }
    
    localStorage.setItem('@zenkai-cart', JSON.stringify(carrinho));
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
          
          {/* IMAGEM DO PRODUTO (Agora é dinâmica) */}
          <div className="bg-[#161920] rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center h-[500px] shadow-2xl relative">
            <span className="absolute top-6 left-6 bg-black/60 backdrop-blur px-4 py-1 rounded-full text-xs font-bold text-gray-300 uppercase tracking-widest border border-white/10 z-10">
              {produto.categoria}
            </span>
            <img src={imagemExibida} alt={produto.nome} className="w-full h-full object-cover transition-all duration-500"/>
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-black mb-4 leading-tight">{produto.nome}</h1>
            <div className="mb-8">
              <p className="text-[#00e5ff] font-mono text-4xl font-bold mb-2">R$ {produto.preco.toFixed(2)}</p>
            </div>

            {/* SELETOR DE COR */}
            {coresDisponiveis.length > 0 && (
              <div className="mb-6">
                <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-3">Selecione a Cor</h3>
                <div className="flex flex-wrap gap-3">
                  {coresDisponiveis.map(cor => (
                    <button
                      key={cor}
                      onClick={() => setCorSelecionada(cor)}
                      className={`px-5 py-2 rounded-xl font-bold text-sm border transition-all ${corSelecionada === cor ? 'bg-[#00e5ff] border-[#00e5ff] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/30 text-gray-300'}`}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SELETOR DE TAMANHO */}
            {corSelecionada && (
              <div className="mb-8">
                 <div className="flex justify-between items-end mb-3">
                   <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase">Selecione o Tamanho</h3>
                   {tamanhoSelecionado && <span className="text-xs text-[#00e5ff] font-mono">Restam {estoqueVarianteAtual} unid.</span>}
                 </div>
                 <div className="flex flex-wrap gap-3">
                   {tamanhosDaCor.map(variante => (
                     <button
                       key={variante.Tamanho}
                       disabled={variante.Quantidade_Estoque === 0}
                       onClick={() => setTamanhoSelecionado(variante.Tamanho)}
                       className={`h-12 min-w-[3rem] px-4 rounded-xl font-mono font-bold text-lg border transition-all ${tamanhoSelecionado === variante.Tamanho ? 'bg-[#00e5ff] border-[#00e5ff] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/30 text-gray-300'} ${variante.Quantidade_Estoque === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                     >
                       {variante.Tamanho}
                     </button>
                   ))}
                 </div>
              </div>
            )}

            <div className="bg-[#161920] p-6 rounded-2xl border border-white/5 mb-8 mt-2">
              <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-3 border-b border-white/10 pb-2">Descrição</h3>
              <p className="text-gray-300 leading-relaxed text-sm">{produto.descricao || "Nenhuma descrição."}</p>
            </div>

            <button disabled={!corSelecionada || !tamanhoSelecionado || estoqueVarianteAtual === 0} onClick={handleAddCarrinho} className="w-full bg-[#00e5ff] text-black font-black py-5 rounded-xl hover:bg-white hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3 text-lg">
              <ShoppingBag size={24} /> 
              {!corSelecionada ? 'SELECIONE UMA COR' : !tamanhoSelecionado ? 'SELECIONE UM TAMANHO' : `ADICIONAR AO CARRINHO`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}