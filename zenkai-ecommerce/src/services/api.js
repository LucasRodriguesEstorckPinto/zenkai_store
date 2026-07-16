const BASE_URL = 'http://localhost:8000/zenkai/api';

export const api = {
  getProdutos: async () => {
    const response = await fetch(`${BASE_URL}/produtos`);
    if (!response.ok) throw new Error('Falha ao buscar produtos');
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
    
    // Salva a sessão do usuário
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