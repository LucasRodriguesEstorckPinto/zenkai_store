import { useState, useEffect, useRef } from 'react';
import { Package, Search, ShoppingCart, LogOut, Plus, Trash2, Truck, Handbag, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function PdvVendedor() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [vendaAtiva, setVendaAtiva] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('venda'); // 'venda' ou 'estoque'
  
  // Estado do formulário de novo produto
  const [formProduto, setFormProduto] = useState({
    nome: '', descricao: '', preco: '', categoria: '', estoque: '', imagem: null
  });
  const [cadastrando, setCadastrando] = useState(false);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const carregarEstoque = async () => {
    setLoading(true);
    try {
      const dados = await api.getProdutos();
      setProdutos(dados);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  // --- Funções de Venda ---
  const adicionarItem = (produto) => {
    const itemExistente = vendaAtiva.find(item => item.id === produto.id);
    if (itemExistente) {
      setVendaAtiva(vendaAtiva.map(item => 
        item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item
      ));
    } else {
      setVendaAtiva([...vendaAtiva, { ...produto, qtd: 1, tipoEntrega: 'imediata' }]);
    }
  };

  const removerItem = (id) => {
    setVendaAtiva(vendaAtiva.filter(item => item.id !== id));
  };

  const alterarTipoEntrega = (id, tipo) => {
    setVendaAtiva(vendaAtiva.map(item => 
      item.id === id ? { ...item, tipoEntrega: tipo } : item
    ));
  };

  const totalVenda = vendaAtiva.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  const finalizarVendaPresencial = () => {
    // Aqui no futuro podemos integrar com o endpoint de checkout também!
    alert(`Venda finalizada no PDV com sucesso! Total: R$ ${totalVenda.toFixed(2)}`);
    setVendaAtiva([]);
  };

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // --- Funções de Cadastro de Produto ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormProduto({ ...formProduto, imagem: e.target.files[0] });
    }
  };

  const handleCadastrarProduto = async (e) => {
    e.preventDefault();
    setCadastrando(true);

    try {
      const formData = new FormData();
      formData.append('nome', formProduto.nome);
      formData.append('descricao', formProduto.descricao);
      formData.append('preco', formProduto.preco);
      formData.append('categoria', formProduto.categoria);
      formData.append('estoque', formProduto.estoque);
      if (formProduto.imagem) {
        formData.append('imagem', formProduto.imagem);
      }

      await api.criarProduto(formData);
      
      alert('Produto cadastrado com sucesso!');
      setFormProduto({ nome: '', descricao: '', preco: '', categoria: '', estoque: '', imagem: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      await carregarEstoque(); // Atualiza a lista
      setAbaAtiva('venda'); // Volta para a tela de vendas
    } catch (error) {
      alert('Erro ao cadastrar produto: ' + error.message);
    } finally {
      setCadastrando(false);
    }
  };

  return (
    <div className="h-screen flex bg-zenkai-bg overflow-hidden text-white">
      {/* Sidebar - Navegação */}
      <aside className="w-20 lg:w-64 border-r border-zenkai-border bg-zenkai-surface p-4 flex flex-col items-center lg:items-start">
        <h1 className="hidden lg:block text-2xl font-bold tracking-tighter mb-10">
          ZEN<span className="text-zenkai-neonGreen">KAI</span> <span className="text-xs text-zenkai-textMuted font-normal">PDV</span>
        </h1>
        <nav className="space-y-4 flex-1 w-full">
          <button 
            onClick={() => setAbaAtiva('venda')}
            className={`flex items-center justify-center lg:justify-start gap-3 w-full p-3 rounded-lg transition-all ${abaAtiva === 'venda' ? 'bg-zenkai-neonGreen/10 text-zenkai-neonGreen border border-zenkai-neonGreen/20 font-bold' : 'text-zenkai-textMuted hover:bg-white/5 hover:text-white'}`}
          >
            <ShoppingCart size={20} /> <span className="hidden lg:block">Nova Venda</span>
          </button>
          <button 
            onClick={() => setAbaAtiva('estoque')}
            className={`flex items-center justify-center lg:justify-start gap-3 w-full p-3 rounded-lg transition-all ${abaAtiva === 'estoque' ? 'bg-zenkai-neonGreen/10 text-zenkai-neonGreen border border-zenkai-neonGreen/20 font-bold' : 'text-zenkai-textMuted hover:bg-white/5 hover:text-white'}`}
          >
            <Package size={20} /> <span className="hidden lg:block">Gerenciar Estoque</span>
          </button>
        </nav>
        <button onClick={() => { api.logout(); navigate('/'); }} className="flex items-center gap-3 text-red-400 p-3 hover:bg-red-500/10 rounded-lg w-full">
          <LogOut size={20} /> <span className="hidden lg:block">Sair</span>
        </button>
      </aside>

      {/* Painel Central Dinâmico */}
      <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
        
        {abaAtiva === 'venda' ? (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zenkai-textMuted" size={20} />
              <input 
                type="text" 
                placeholder="Bipar código ou digitar nome do produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zenkai-surface border border-zenkai-border rounded-xl text-white focus:outline-none focus:border-zenkai-neonGreen transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtosFiltrados.map(produto => (
                  <button 
                    key={produto.id}
                    onClick={() => adicionarItem(produto)}
                    className="bg-zenkai-surface border border-zenkai-border p-4 rounded-xl text-left hover:border-zenkai-neonGreen/50 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-zenkai-textMuted">{produto.categoria}</span>
                        <Plus size={16} className="text-zenkai-neonGreen opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-bold text-sm mb-1">{produto.nome}</h3>
                      <p className="text-zenkai-neonGreen font-mono text-sm">R$ {produto.preco.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* TELA DE ESTOQUE E CADASTRO */
          <div className="max-w-2xl mx-auto w-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-zenkai-neonGreen flex items-center gap-2">
              <Package /> Cadastrar Novo Produto
            </h2>
            
            <form onSubmit={handleCadastrarProduto} className="space-y-4 bg-zenkai-surface p-6 rounded-xl border border-zenkai-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-zenkai-textMuted mb-1">Nome do Produto</label>
                  <input required type="text" value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} className="w-full p-2 bg-black/50 border border-zenkai-border rounded focus:border-zenkai-neonGreen focus:outline-none" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-zenkai-textMuted mb-1">Descrição</label>
                  <textarea rows="3" value={formProduto.descricao} onChange={e => setFormProduto({...formProduto, descricao: e.target.value})} className="w-full p-2 bg-black/50 border border-zenkai-border rounded focus:border-zenkai-neonGreen focus:outline-none"></textarea>
                </div>

                <div>
                  <label className="block text-sm text-zenkai-textMuted mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" value={formProduto.preco} onChange={e => setFormProduto({...formProduto, preco: e.target.value})} className="w-full p-2 bg-black/50 border border-zenkai-border rounded focus:border-zenkai-neonGreen focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm text-zenkai-textMuted mb-1">Qtd em Estoque</label>
                  <input required type="number" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} className="w-full p-2 bg-black/50 border border-zenkai-border rounded focus:border-zenkai-neonGreen focus:outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-zenkai-textMuted mb-1">Categoria</label>
                  <input required type="text" placeholder="Esporte, casual..." value={formProduto.categoria} onChange={e => setFormProduto({...formProduto, categoria: e.target.value})} className="w-full p-2 bg-black/50 border border-zenkai-border rounded focus:border-zenkai-neonGreen focus:outline-none" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-zenkai-textMuted mb-1">Imagem do Produto (Upload)</label>
                  <div className="border-2 border-dashed border-zenkai-border rounded-lg p-4 text-center hover:border-zenkai-neonGreen transition-colors bg-black/30">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={handleFileChange} 
                      className="hidden" 
                      id="upload-imagem"
                    />
                    <label htmlFor="upload-imagem" className="cursor-pointer flex flex-col items-center justify-center">
                      <UploadCloud size={32} className="text-zenkai-textMuted mb-2" />
                      <span className="text-sm font-medium text-zenkai-neonGreen">
                        {formProduto.imagem ? formProduto.imagem.name : 'Clique para selecionar a imagem'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <button disabled={cadastrando} type="submit" className="w-full mt-6 bg-zenkai-neonGreen text-black font-bold py-3 rounded-lg hover:shadow-[0_0_15px_rgba(57,255,20,0.4)] transition-all">
                {cadastrando ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Painel Direita - SÓ MOSTRA SE ESTIVER NA TELA DE VENDA */}
      {abaAtiva === 'venda' && (
        <section className="w-96 border-l border-zenkai-border bg-zenkai-surface flex flex-col shadow-2xl">
          <div className="p-6 border-b border-zenkai-border bg-black/20">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart size={18} className="text-zenkai-neonGreen" /> Venda Ativa
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {vendaAtiva.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zenkai-textMuted opacity-50">
                <ShoppingCart size={48} className="mb-4" />
                <p className="text-sm">Nenhum item selecionado</p>
              </div>
            ) : (
              vendaAtiva.map(item => (
                <div key={item.id} className="bg-black/30 border border-zenkai-border p-3 rounded-lg relative group">
                  <button 
                    onClick={() => removerItem(item.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="flex justify-between font-bold text-xs mb-2">
                    <span>{item.qtd}x {item.nome}</span>
                    <span>R$ {(item.preco * item.qtd).toFixed(2)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 p-1 bg-zenkai-bg rounded border border-zenkai-border">
                    <button 
                      onClick={() => alterarTipoEntrega(item.id, 'imediata')}
                      className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition-all ${item.tipoEntrega === 'imediata' ? 'bg-zenkai-neonGreen text-black' : 'text-zenkai-textMuted'}`}
                    >
                      <Handbag size={12} /> LEVAR
                    </button>
                    <button 
                      onClick={() => alterarTipoEntrega(item.id, 'entrega')}
                      className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition-all ${item.tipoEntrega === 'entrega' ? 'bg-zenkai-neonGreen text-black' : 'text-zenkai-textMuted'}`}
                    >
                      <Truck size={12} /> ENVIAR
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-black/40 border-t border-zenkai-border">
            <div className="flex justify-between text-zenkai-textMuted text-sm mb-1">
              <span>Subtotal</span>
              <span>R$ {totalVenda.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-xl mb-6">
              <span>Total</span>
              <span className="text-zenkai-neonGreen font-mono">R$ {totalVenda.toFixed(2)}</span>
            </div>
            <button 
              disabled={vendaAtiva.length === 0}
              onClick={finalizarVendaPresencial}
              className="w-full bg-zenkai-neonGreen text-black font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              FINALIZAR VENDA (F10)
            </button>
          </div>
        </section>
      )}
    </div>
  );
}