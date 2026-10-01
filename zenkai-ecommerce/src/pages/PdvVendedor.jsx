import { useState, useEffect } from 'react';
import { Package, Search, ShoppingCart, LogOut, Plus, Trash2, UploadCloud, CheckCircle2, X, Users, Banknote, CreditCard, QrCode, Printer, BarChart3, TrendingUp, History, Pencil, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function PdvVendedor() {
  const [produtos, setProdutos] = useState([]);
  const [venda, setVenda] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [aba, setAba] = useState('venda'); 
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  
  // VENDA BALCÃO
  const [prodSelecionado, setProdSelecionado] = useState(null);
  const [corVendaSelecionada, setCorVendaSelecionada] = useState(null);
  
  // MODAIS E FLUXO
  const [modalPagamento, setModalPagamento] = useState(false);
  const [reciboData, setReciboData] = useState(null);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [descontoTipo, setDescontoTipo] = useState('R$'); 
  const [descontoValor, setDescontoValor] = useState('');
  const [metodoPgto, setMetodoPgto] = useState('DINHEIRO'); 
  const [valorRecebido, setValorRecebido] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nome: '', email: '', telefone: '' });
  const [dashData, setDashData] = useState(null);

  // ESTADO DE CADASTRO/EDIÇÃO (NOVA LÓGICA DE CORES E IMAGENS)
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', categoria: '' });
  const [variantes, setVariantes] = useState([
    { cor: '', imagem: null, preview: null, tamanhos: [{ tamanho: '', qtd: '' }] }
  ]);

  const nav = useNavigate();

  const loadDados = async () => { try { setProdutos(await api.getProdutos()); } catch (e) { console.error(e); } };
  const loadDashboard = async () => { try { setDashData(await api.getDashboard()); } catch (e) { console.error(e); } };
  const loadPedidos = async () => { try { setPedidos(await api.getPedidos()); } catch (e) { console.error(e); } };

  useEffect(() => { loadDados(); }, []);
  useEffect(() => {
    if (aba === 'dashboard') loadDashboard();
    if (aba === 'historico') loadPedidos();
  }, [aba]);

  useEffect(() => {
    if (clienteBusca.length >= 3) api.buscarClientes(clienteBusca).then(setClientesEncontrados);
    else setClientesEncontrados([]);
  }, [clienteBusca]);

  const subtotal = venda.reduce((a, i) => a + (i.preco * i.qtd), 0);
  let descontoCalculado = descontoTipo === 'R$' ? Number(descontoValor || 0) : subtotal * (Number(descontoValor || 0) / 100);
  let limiteExcedido = false;
  if (descontoCalculado > subtotal * 0.5) { descontoCalculado = subtotal * 0.5; limiteExcedido = true; }
  const totalComDesconto = Math.max(0, subtotal - descontoCalculado);
  const troco = metodoPgto === 'DINHEIRO' ? Math.max(0, Number(valorRecebido || 0) - totalComDesconto) : 0;

  const processarPagamento = async () => {
    if (metodoPgto === 'DINHEIRO' && Number(valorRecebido || 0) < totalComDesconto) return alert('Valor menor que o total!');
    setLoading(true);
    try {
      await api.checkout({
        total: subtotal, desconto: descontoCalculado, cliente_id: clienteSelecionado?.id,
        itens: venda.map(i => ({ produto_id: i.id, cor: i.cor, tamanho: i.tamanho, quantidade: i.qtd, preco_unitario: i.preco })),
        pagamento: { metodo: metodoPgto, valor_recebido: metodoPgto === 'DINHEIRO' ? Number(valorRecebido) : totalComDesconto, parcelas: metodoPgto === 'CARTAO' ? parcelas : 1 }
      });
      setReciboData({
        itens: [...venda], subtotal, desconto: descontoCalculado, total: totalComDesconto,
        metodo: metodoPgto, valorPago: metodoPgto === 'DINHEIRO' ? Number(valorRecebido) : totalComDesconto,
        troco, cliente: clienteSelecionado ? clienteSelecionado.nome : 'Consumidor Final', data: new Date().toLocaleString('pt-BR')
      });
      setVenda([]); setModalPagamento(false);
      setClienteBusca(''); setClienteSelecionado(null); setDescontoValor(''); setValorRecebido(''); setMetodoPgto('DINHEIRO');
      loadDados();
    } catch (e) { alert('Erro: ' + e.message); } finally { setLoading(false); }
  };

  const cancelarVenda = async (id) => {
    if(!window.confirm('Tem certeza? O estoque será devolvido.')) return;
    try { await api.cancelarPedido(id); alert('Cancelado com sucesso!'); loadPedidos(); loadDados(); } catch(e) { alert(e.message); }
  };

  // --- FUNÇÕES DE MANIPULAÇÃO DE VARIANTES NO CADASTRO ---
  const addCor = () => setVariantes([...variantes, { cor: '', imagem: null, preview: null, tamanhos: [{ tamanho: '', qtd: '' }] }]);
  const removeCor = (cIdx) => setVariantes(variantes.filter((_, i) => i !== cIdx));
  const updateCor = (cIdx, field, value) => {
    const nv = [...variantes];
    nv[cIdx][field] = value;
    if (field === 'imagem' && value) nv[cIdx].preview = URL.createObjectURL(value);
    setVariantes(nv);
  };
  const addTamanho = (cIdx) => {
    const nv = [...variantes];
    nv[cIdx].tamanhos.push({ tamanho: '', qtd: '' });
    setVariantes(nv);
  };
  const removeTamanho = (cIdx, tIdx) => {
    const nv = [...variantes];
    nv[cIdx].tamanhos = nv[cIdx].tamanhos.filter((_, i) => i !== tIdx);
    setVariantes(nv);
  };
  const updateTamanho = (cIdx, tIdx, field, value) => {
    const nv = [...variantes];
    nv[cIdx].tamanhos[tIdx][field] = value;
    setVariantes(nv);
  };

  const iniciarEdicao = async (p) => {
    setProdutoEditando(p.id);
    setForm({ nome: p.nome, descricao: p.descricao || '', preco: p.preco, categoria: p.categoria });
    
    // Busca os detalhes completos do produto na API (para obter variantes formatadas)
    try {
      const prodDetalhe = await api.getProduto(p.id);
      // Agrupa variantes por cor para reconstruir o formulário
      const gruposCor = {};
      prodDetalhe.variantes.forEach(v => {
        if (!gruposCor[v.Cor]) gruposCor[v.Cor] = { cor: v.Cor, imagemURL: v.Imagem, tamanhos: [] };
        gruposCor[v.Cor].tamanhos.push({ tamanho: v.Tamanho, qtd: v.Quantidade_Estoque });
      });
      
      const varState = Object.values(gruposCor).map(g => ({
        cor: g.cor, imagem: null, preview: g.imagemURL, tamanhos: g.tamanhos
      }));
      setVariantes(varState.length > 0 ? varState : [{ cor: '', imagem: null, preview: null, tamanhos: [{ tamanho: '', qtd: '' }] }]);
    } catch(e) { alert("Erro ao carregar variantes para edição."); }
  };

  const cancelarEdicao = () => {
    setProdutoEditando(null);
    setForm({ nome: '', descricao: '', preco: '', categoria: '' });
    setVariantes([{ cor: '', imagem: null, preview: null, tamanhos: [{ tamanho: '', qtd: '' }] }]);
  };

  const handleCadastroOuEdicao = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(k => { if (form[k]) fd.append(k, form[k]); });
      
      // Constrói o payload de variantes e anexa imagens
      const payloadVariantes = [];
      let totalEstoque = 0;

      variantes.forEach((v, idx) => {
        if (!v.cor.trim()) throw new Error("Todas as variantes devem ter uma cor definida.");
        const tams = {};
        v.tamanhos.forEach(t => {
          if (t.tamanho && t.qtd) {
            tams[t.tamanho] = parseInt(t.qtd);
            totalEstoque += parseInt(t.qtd);
          }
        });
        
        payloadVariantes.push({ cor: v.cor, tamanhos: tams });
        // Se houver ficheiro novo, anexa-o com o nome "imagem_X" onde X é a cor
        if (v.imagem) fd.append(`imagem_${v.cor}`, v.imagem);
      });

      if (totalEstoque === 0) throw new Error("Adicione pelo menos um tamanho com estoque.");
      fd.append('variantes', JSON.stringify(payloadVariantes));
      fd.append('estoque_total', totalEstoque); // Apenas referencial se necessário

      if (produtoEditando) {
        await api.editarProduto(produtoEditando, fd);
        alert('Produto atualizado!');
      } else {
        await api.criarProduto(fd);
        alert('Produto cadastrado!');
      }
      cancelarEdicao();
      loadDados();
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  const excluirDb = async (id) => { if(window.confirm('Excluir definitivamente?')){ try { await api.excluirProduto(id); loadDados(); } catch(e) { alert(e.message); }}};

  // --- LÓGICA DE VENDA BALCÃO ---
  const confirmarTamanhoVenda = (p, cor, tamanho) => {
    const idCarrinho = `${p.id}-${cor}-${tamanho}`;
    const ex = venda.find(i => i.idCarrinho === idCarrinho);
    if (ex) setVenda(venda.map(i => i.idCarrinho === idCarrinho ? {...i, qtd: i.qtd + 1} : i));
    else setVenda([...venda, {...p, idCarrinho, cor, tamanho, qtd: 1}]);
    setProdSelecionado(null);
    setCorVendaSelecionada(null);
  };

  const upQtd = (idCarrinho, delta) => setVenda(venda.map(i => i.idCarrinho === idCarrinho ? {...i, qtd: Math.max(1, i.qtd + delta)} : i));

  // Agrupar variantes do produto selecionado no balcão
  const coresProdutoSelecionado = prodSelecionado?.variantes 
    ? [...new Set(prodSelecionado.variantes.map(v => v.Cor))] 
    : [];
  const tamanhosCorSelecionada = prodSelecionado?.variantes && corVendaSelecionada
    ? prodSelecionado.variantes.filter(v => v.Cor === corVendaSelecionada)
    : [];

  return (
    <div className="h-screen flex bg-[#0f1115] text-white font-sans overflow-hidden">
      <aside className="w-20 lg:w-64 border-r border-white/10 bg-[#161920] flex flex-col p-4 z-10">
        <h1 className="hidden lg:block text-2xl font-black mb-10 pl-2">ZEN<span className="text-[#39ff14]">KAI</span> <span className="text-[10px] text-gray-500 uppercase">PDV</span></h1>
        <nav className="flex-1 space-y-2">
          {[{id: 'venda', icon: <ShoppingCart size={22}/>}, {id: 'estoque', icon: <Package size={22}/>}, {id: 'historico', icon: <History size={22}/>}, {id: 'dashboard', icon: <BarChart3 size={22}/>}].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} className={`w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-xl font-bold transition-all ${aba === a.id ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              {a.icon} <span className="hidden lg:block capitalize">{a.id}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => { api.logout(); nav('/'); }} className="w-full flex justify-center lg:justify-start items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><LogOut size={22} /> <span className="hidden lg:block font-bold">Sair</span></button>
      </aside>

      <main className="flex-1 flex flex-col p-8 overflow-hidden bg-[#0f1115] relative">
        
        {/* ABA: HISTÓRICO DE VENDAS */}
        {aba === 'historico' && (
          <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
             <h2 className="text-2xl font-black mb-6 text-[#39ff14] flex items-center gap-3"><History/> HISTÓRICO DE VENDAS</h2>
             <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 shadow-2xl flex-1">
                <div className="grid grid-cols-6 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-3 px-4">
                  <span className="col-span-1">Pedido</span>
                  <span className="col-span-2">Cliente</span>
                  <span className="col-span-1">Valor</span>
                  <span className="col-span-1">Status</span>
                  <span className="col-span-1 text-right">Ações</span>
                </div>
                <div className="space-y-3">
                  {pedidos.map(ped => (
                    <div key={ped.id} className="grid grid-cols-6 items-center bg-black/40 p-4 rounded-xl border border-white/5 hover:border-[#39ff14]/30 transition-colors">
                      <span className="col-span-1 font-mono text-gray-300">#{ped.id.toString().padStart(4, '0')}</span>
                      <span className="col-span-2 font-bold text-sm truncate pr-4">{ped.cliente || 'Consumidor Final'}</span>
                      <span className="col-span-1 text-[#39ff14] font-mono">R$ {ped.total.toFixed(2)}</span>
                      <span className="col-span-1">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${ped.status === 'Cancelado' ? 'bg-red-500/10 text-red-500' : 'bg-[#39ff14]/10 text-[#39ff14]'}`}>{ped.status}</span>
                      </span>
                      <div className="col-span-1 flex justify-end gap-2">
                        {ped.status !== 'Cancelado' && (
                          <>
                            <button onClick={() => setReciboData({ itens: ped.itens, subtotal: ped.total, desconto: 0, total: ped.total, metodo: ped.metodo_pgto || 'N/A', valorPago: ped.total, troco: 0, cliente: ped.cliente || 'Consumidor Final', data: ped.data })} className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-lg" title="Ver Recibo"><Printer size={16}/></button>
                            <button onClick={() => cancelarVenda(ped.id)} className="text-red-400 hover:text-white p-2 hover:bg-red-500 rounded-lg transition-colors" title="Cancelar Venda"><Trash2 size={16}/></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {aba === 'dashboard' && dashData && (
          <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
            <h2 className="text-2xl font-black mb-8 text-[#39ff14] flex items-center gap-3"><TrendingUp/> DASHBOARD DE VENDAS</h2>
            {/* O dashboard mantém-se inalterado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Faturamento Hoje</p><p className="text-3xl font-black text-white font-mono">R$ {dashData.faturamento_hoje.toFixed(2)}</p></div>
              <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl relative overflow-hidden"><div className="absolute top-0 right-0 w-24 h-24 bg-[#39ff14] opacity-5 rounded-bl-full"></div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Faturamento no Mês</p><p className="text-3xl font-black text-[#39ff14] font-mono">R$ {dashData.faturamento_mes.toFixed(2)}</p></div>
              <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ticket Médio (Mês)</p><p className="text-3xl font-black text-white font-mono">R$ {dashData.ticket_medio.toFixed(2)}</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#161920] border border-white/10 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 border-b border-white/10 pb-4">Receita por Pagamento</h3>
                <div className="space-y-4">
                  {['PIX', 'CARTAO', 'DINHEIRO'].map(tipo => {
                    const valor = dashData.pagamentos[tipo] || 0; const pct = dashData.faturamento_mes > 0 ? (valor / dashData.faturamento_mes) * 100 : 0;
                    return (<div key={tipo}><div className="flex justify-between text-sm mb-1 font-bold"><span>{tipo}</span> <span className="font-mono">R$ {valor.toFixed(2)}</span></div><div className="w-full bg-black rounded-full h-2"><div className="bg-[#39ff14] h-2 rounded-full" style={{ width: `${pct}%` }}></div></div></div>);
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: VENDA PDV */}
        {aba === 'venda' && (
          <div className="h-full flex flex-col">
             <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Buscar produto..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-[#161920] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-[#39ff14] transition-all shadow-inner text-lg font-mono" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={async () => {
                    // Ao clicar no PDV, busca os detalhes completos da API para ter as variantes
                    try {
                      const detalhe = await api.getProduto(p.id);
                      setProdSelecionado(detalhe);
                      setCorVendaSelecionada(null);
                    } catch(e) { alert("Erro ao carregar produto."); }
                  }} disabled={p.estoque === 0} className="bg-[#161920] border border-white/5 p-5 rounded-2xl text-left hover:border-[#39ff14] hover:bg-[#39ff14]/5 transition-all flex flex-col disabled:opacity-30 disabled:cursor-not-allowed">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{p.categoria}</span>
                    <h3 className="font-bold text-base mb-2 flex-1">{p.nome}</h3>
                    <div className="flex justify-between items-end w-full">
                       <span className="text-xs px-2 py-1 bg-black rounded border border-white/5 text-gray-400 font-mono">ESTOQUE TOTAL: {p.estoque}</span>
                       <span className="text-[#39ff14] font-mono font-bold">R$ {p.preco.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA: ESTOQUE (CADASTRAR E EDITAR) */}
        {aba === 'estoque' && (
          <div className="h-full flex flex-col pb-4">
            <h2 className="text-2xl font-black mb-6 text-[#39ff14] flex items-center gap-3"><Package/> GERENCIADOR</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-160px)]">
              
              {/* FORMULÁRIO DE CADASTRO */}
              <div className={`bg-[#161920] p-6 rounded-3xl border ${produtoEditando ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.1)]' : 'border-white/10'} overflow-y-auto custom-scrollbar`}>
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                   <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">{produtoEditando ? <><Pencil size={16} className="text-orange-500"/> MODO DE EDIÇÃO</> : 'CADASTRAR NOVO'}</h3>
                   {produtoEditando && <button onClick={cancelarEdicao} className="text-xs bg-white/10 px-3 py-1 rounded hover:bg-white/20">CANCELAR</button>}
                </div>
                <form onSubmit={handleCadastroOuEdicao} className="space-y-6">
                  {/* DADOS BÁSICOS */}
                  <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Nome</label><input required className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})}/></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Descrição</label><textarea className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none resize-none h-20 text-sm" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-gray-400 uppercase">Preço (R$)</label><input required type="number" step="0.01" className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none font-mono text-[#39ff14]" value={form.preco} onChange={e=>setForm({...form, preco: e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-gray-400 uppercase">Categoria</label><input required className="w-full mt-1 p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none" value={form.categoria} onChange={e=>setForm({...form, categoria: e.target.value})}/></div>
                    </div>
                  </div>

                  {/* BLOCO DE VARIANTES (CORES E TAMANHOS) */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Cores e Tamanhos</label>
                      <button type="button" onClick={addCor} className="text-[#39ff14] hover:text-white flex items-center gap-1 text-xs font-bold bg-[#39ff14]/10 px-3 py-1.5 rounded-lg"><Plus size={14}/> NOVA COR</button>
                    </div>

                    <div className="space-y-6">
                      {variantes.map((v, cIdx) => (
                        <div key={cIdx} className="bg-black/40 p-5 rounded-2xl border border-white/10 relative">
                          {variantes.length > 1 && <button type="button" onClick={() => removeCor(cIdx)} className="absolute top-4 right-4 text-red-500 hover:scale-110 transition-transform"><Trash2 size={16}/></button>}
                          
                          <div className="flex flex-col md:flex-row gap-4">
                            {/* IMAGEM DA COR */}
                            <div className="w-full md:w-32 flex-shrink-0">
                               <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Imagem desta Cor</label>
                               <label className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#39ff14] overflow-hidden relative bg-black transition-colors">
                                 <input type="file" className="hidden" onChange={e => updateCor(cIdx, 'imagem', e.target.files[0])}/>
                                 {v.preview ? <img src={v.preview} className="w-full h-full object-cover"/> : <><ImageIcon size={24} className="text-gray-500 mb-2"/><span className="text-[10px] text-gray-400 text-center px-2">Upload</span></>}
                               </label>
                            </div>

                            {/* DADOS DA COR E TAMANHOS */}
                            <div className="flex-1 space-y-4">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nome da Cor</label>
                                <input required placeholder="Ex: Preto, Branco..." className="w-full p-3 bg-black border border-white/10 rounded-xl focus:border-[#39ff14] outline-none text-sm font-bold text-[#39ff14]" value={v.cor} onChange={e => updateCor(cIdx, 'cor', e.target.value)}/>
                              </div>
                              
                              <div className="bg-[#161920] p-3 rounded-xl border border-white/5 space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tamanhos</label>
                                  <button type="button" onClick={() => addTamanho(cIdx)} className="text-[#39ff14] hover:text-white flex items-center gap-1 text-[10px] font-bold"><Plus size={12}/> ADD</button>
                                </div>
                                {v.tamanhos.map((t, tIdx) => (
                                  <div key={tIdx} className="flex gap-2 items-center">
                                    <input required placeholder="Tam (Ex: 40, M)" className="flex-1 p-2.5 bg-black border border-white/10 rounded-lg focus:border-[#39ff14] outline-none font-mono text-xs" value={t.tamanho} onChange={e => updateTamanho(cIdx, tIdx, 'tamanho', e.target.value)}/>
                                    <input required type="number" placeholder="Qtd" className="w-20 p-2.5 bg-black border border-white/10 rounded-lg focus:border-[#39ff14] outline-none font-mono text-xs" value={t.qtd} onChange={e => updateTamanho(cIdx, tIdx, 'qtd', e.target.value)}/>
                                    {v.tamanhos.length > 1 && <button type="button" onClick={() => removeTamanho(cIdx, tIdx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg"><X size={14}/></button>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button disabled={loading} type="submit" className={`w-full text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50 mt-4 ${produtoEditando ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.2)]'}`}>{loading ? 'SALVANDO...' : (produtoEditando ? 'SALVAR ALTERAÇÕES' : 'SALVAR PRODUTO')}</button>
                </form>
              </div>

              {/* LISTA DE PRODUTOS REGISTRADOS */}
              <div className="bg-[#161920] p-6 rounded-3xl border border-white/10 overflow-y-auto custom-scrollbar">
                 <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 border-b border-white/10 pb-4">Registrados</h3>
                 <div className="space-y-3">
                   {produtos.map(p => (
                     <div key={p.id} className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl group">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-black rounded border border-white/10 overflow-hidden"><img src={p.imagem || 'https://via.placeholder.com/40'} className="w-full h-full object-cover"/></div>
                          <div><p className="font-bold text-sm">{p.nome}</p><p className="text-[10px] text-gray-500 font-mono">ESTOQUE TOTAL: {p.estoque} | R$ {p.preco.toFixed(2)}</p></div>
                       </div>
                       <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={()=>iniciarEdicao(p)} className="text-orange-400 p-2 hover:bg-orange-500/20 rounded-lg"><Pencil size={16}/></button>
                         <button onClick={()=>excluirDb(p.id)} className="text-red-500 p-2 hover:bg-red-500 hover:text-white rounded-lg"><Trash2 size={16}/></button>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CARRINHO LATERAL */}
      {aba === 'venda' && (
        <section className="w-96 bg-[#161920] border-l border-white/10 flex flex-col shadow-2xl z-20">
          <div className="h-20 flex items-center px-6 bg-[#0f1115] border-b border-white/10"><h2 className="font-black text-lg flex items-center gap-3"><ShoppingCart className="text-[#39ff14]"/> PDV CHECKOUT</h2></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {venda.map(i => (
              <div key={i.idCarrinho} className="bg-black/40 p-4 rounded-xl border border-white/5 relative">
                <button onClick={() => setVenda(venda.filter(x=>x.idCarrinho!==i.idCarrinho))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full z-10 hover:scale-110"><Trash2 size={12}/></button>
                <div className="mb-3">
                  <p className="font-bold text-sm leading-tight pr-4">{i.nome}</p>
                  <p className="text-xs text-gray-400 mt-1">Cor: <span className="text-[#39ff14] font-bold mr-2">{i.cor}</span> Tam: <span className="text-white font-bold">{i.tamanho}</span></p>
                  <p className="text-[#39ff14] font-mono mt-1 text-sm">R$ {i.preco.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between bg-black rounded-lg p-1 border border-white/10">
                  <button onClick={()=>upQtd(i.idCarrinho, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                  <span className="font-bold text-sm w-8 text-center">{i.qtd}</span>
                  <button onClick={()=>upQtd(i.idCarrinho, 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-[#0f1115] border-t border-white/10">
             <div className="flex justify-between items-end mb-6"><span className="text-gray-500 text-xs font-bold uppercase">Subtotal</span><span className="text-3xl font-black text-white font-mono">R$ {subtotal.toFixed(2)}</span></div>
             <button disabled={venda.length===0} onClick={() => setModalPagamento(true)} className="w-full bg-[#39ff14] text-black font-black py-4 rounded-xl hover:bg-white transition-all disabled:opacity-30 flex justify-center items-center gap-2"><CheckCircle2 size={20}/> IR PARA PAGAMENTO</button>
          </div>
        </section>
      )}

      {/* MODAL 1: SELEÇÃO DE COR E TAMANHO NO BALCÃO */}
      {prodSelecionado && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#161920] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <button onClick={() => { setProdSelecionado(null); setCorVendaSelecionada(null); }} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full"><X size={16}/></button>
            <div className="mb-6">
              <h3 className="font-bold text-xl leading-tight pr-8">{prodSelecionado.nome}</h3>
              <p className="text-[#39ff14] font-mono mt-1 text-lg">R$ {prodSelecionado.preco.toFixed(2)}</p>
            </div>
            
            {/* 1. SELETOR DE COR */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">1. Selecione a Cor</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {coresProdutoSelecionado.map(cor => (
                <button key={cor} onClick={() => setCorVendaSelecionada(cor)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${corVendaSelecionada === cor ? 'bg-[#39ff14] text-black border-[#39ff14]' : 'bg-black/50 text-gray-300 border-white/10 hover:border-[#39ff14]/50'}`}>
                  {cor}
                </button>
              ))}
            </div>

            {/* 2. SELETOR DE TAMANHO (Só aparece após a cor) */}
            {corVendaSelecionada && (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pt-4 border-t border-white/10">2. Selecione o Tamanho</p>
                <div className="grid grid-cols-4 gap-2">
                  {tamanhosCorSelecionada.map((v) => (
                    <button key={v.Tamanho} disabled={v.Quantidade_Estoque === 0} onClick={() => confirmarTamanhoVenda(prodSelecionado, corVendaSelecionada, v.Tamanho)} className={`py-3 rounded-xl border border-white/10 font-mono font-bold transition-all ${v.Quantidade_Estoque === 0 ? 'opacity-20 cursor-not-allowed bg-black/50' : 'bg-black/50 hover:border-[#39ff14] hover:text-[#39ff14]'}`}>
                      {v.Tamanho}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}      
    </div>
  );
}