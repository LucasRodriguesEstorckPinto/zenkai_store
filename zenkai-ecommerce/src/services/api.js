const BASE_URL = 'http://localhost:8000/zenkai/api';

export const api = {
  getProdutos: async () => {
    const response = await fetch(`${BASE_URL}/produtos`);
    if (!response.ok) throw new Error('Falha ao buscar produtos');
    return response.json();
  },

  criarProduto: async (formData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/produtos/cadastro`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // IMPORTANTE: Ao usar FormData com fetch, NÃO defina o 'Content-Type'. 
        // O próprio navegador cuida de configurar como 'multipart/form-data' e adiciona o 'boundary' correto.
      },
      body: formData
    });
    
    if (!response.ok) throw new Error('Erro ao cadastrar produto');
    return response.json();
  },

  checkout: async (pedido) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(pedido)
    });
    
    if (!response.ok) throw new Error('Erro ao processar o checkout');
    return response.json();
  },

  login: async (email, senha) => {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    
    if (!response.ok) throw new Error('Credenciais inválidas');
    const data = await response.json();
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('nome', data.nome);
    
    return data;
  },

  cadastro: async (nome, email, senha, role = 'CLIENTE') => {
    const response = await fetch(`${BASE_URL}/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, role })
    });
    
    if (!response.ok) throw new Error('Erro ao cadastrar');
    return response.json();
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('nome');
  }
};