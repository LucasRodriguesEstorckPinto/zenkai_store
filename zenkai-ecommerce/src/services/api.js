const BASE_URL = 'http://localhost:8000/zenkai/api';

const getAuth = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

const parseProduto = (p) => ({ ...p, tamanhos: p.tamanhos ? JSON.parse(p.tamanhos) : {} });

export const api = {
  getProdutos: async () => {
    const res = await fetch(`${BASE_URL}/produtos`);
    if (!res.ok) throw new Error('Erro ao carregar');
    const data = await res.json();
    return data.map(parseProduto);
  },
  criarProduto: async (formData) => {
    const res = await fetch(`${BASE_URL}/produtos/cadastro`, { method: 'POST', headers: getAuth(), body: formData });
    if (!res.ok) throw new Error('Falha no cadastro');
    return res.json();
  },
  // NOVA FUNÇÃO: Editar Produto
  editarProduto: async (id, formData) => {
    const res = await fetch(`${BASE_URL}/produtos/editar/${id}`, { method: 'POST', headers: getAuth(), body: formData });
    if (!res.ok) throw new Error('Falha ao editar');
    return res.json();
  },
  excluirProduto: async (id) => {
    const res = await fetch(`${BASE_URL}/produtos/${id}`, { method: 'DELETE', headers: getAuth() });
    if (!res.ok) throw new Error('Falha ao excluir');
    return res.json();
  },
  checkout: async (pedido) => {
    const res = await fetch(`${BASE_URL}/checkout`, { method: 'POST', headers: { ...getAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) });
    if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.detail || 'Erro no checkout'); }
    return res.json();
  },
  buscarClientes: async (query) => {
    const res = await fetch(`${BASE_URL}/clientes/buscar?q=${query}`, { headers: getAuth() });
    if (!res.ok) return []; return res.json();
  },
  cadastrarCliente: async (cliente) => {
    const res = await fetch(`${BASE_URL}/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cliente) });
    if (!res.ok) throw new Error('Erro ao cadastrar cliente');
    return res.json();
  },
  getDashboard: async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { headers: getAuth() });
    if (!res.ok) throw new Error('Erro ao carregar dashboard');
    return res.json();
  },
  // NOVAS FUNÇÕES: Histórico e Cancelamento
  getPedidos: async () => {
    const res = await fetch(`${BASE_URL}/pedidos`, { headers: getAuth() });
    if (!res.ok) throw new Error('Erro ao carregar histórico');
    return res.json();
  },
  cancelarPedido: async (id) => {
    const res = await fetch(`${BASE_URL}/pedidos/${id}/cancelar`, { method: 'POST', headers: getAuth() });
    if (!res.ok) throw new Error('Erro ao cancelar pedido');
    return res.json();
  },
  // NOVAS FUNÇÕES: Área do Cliente
  getMeusPedidos: async () => {
    const res = await fetch(`${BASE_URL}/perfil/meus-pedidos`, { headers: getAuth() });
    if (!res.ok) throw new Error('Erro ao carregar pedidos');
    return res.json();
  },
  getPerfil: async () => {
    const res = await fetch(`${BASE_URL}/perfil/dados`, { headers: getAuth() });
    if (!res.ok) throw new Error('Erro ao carregar perfil');
    return res.json();
  },
  atualizarPerfil: async (dados) => {
    const res = await fetch(`${BASE_URL}/perfil/atualizar`, { method: 'PUT', headers: { ...getAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    if (!res.ok) throw new Error('Erro ao atualizar perfil');
    return res.json();
  },
  login: async (email, senha) => {
    const res = await fetch(`${BASE_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
    if (!res.ok) throw new Error('Credenciais recusadas');
    const data = await res.json();
    localStorage.setItem('token', data.token); localStorage.setItem('role', data.role); localStorage.setItem('nome', data.nome);
    return data;
  },
  logout: () => { localStorage.clear(); },
  getProduto: async (id) => {
    const res = await fetch(`${BASE_URL}/produtos/${id}`);
    if (!res.ok) throw new Error('Produto não encontrado');
    return parseProduto(await res.json());
  }
};