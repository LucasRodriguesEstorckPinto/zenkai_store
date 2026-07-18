const BASE_URL = 'http://localhost:8000/zenkai/api';

const getAuth = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export const api = {
  getProdutos: async () => {
    const res = await fetch(`${BASE_URL}/produtos`);
    if (!res.ok) throw new Error('Erro ao carregar');
    return res.json();
  },

  criarProduto: async (formData) => {
    const res = await fetch(`${BASE_URL}/produtos/cadastro`, {
      method: 'POST', headers: getAuth(), body: formData
    });
    if (!res.ok) throw new Error('Falha no cadastro');
    return res.json();
  },

  excluirProduto: async (id) => {
    const res = await fetch(`${BASE_URL}/produtos/${id}`, { method: 'DELETE', headers: getAuth() });
    if (!res.ok) throw new Error('Falha ao excluir');
    return res.json();
  },

  checkout: async (pedido) => {
    const res = await fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: { ...getAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido)
    });
    if (!res.ok) throw new Error('Erro no checkout (Sessão inválida?)');
    return res.json();
  },

  login: async (email, senha) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha })
    });
    if (!res.ok) throw new Error('Credenciais recusadas');
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('nome', data.nome);
    return data;
  },

  logout: () => {
    localStorage.clear();
  }
};