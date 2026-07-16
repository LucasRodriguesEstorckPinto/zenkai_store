

export const mockProdutos = [
  {
    id: 1,
    nome: "Nike Zoom Freak 4",
    categoria: "Basquete",
    preco: 899.90,
    // O banco de dados retornará apenas a chave de referência da imagem
    imagem_ref: "zoomFreak", 
    estoque: { loja_fisica: 5, centro_distribuicao: 12 }
  },
  {
    id: 2,
    nome: "Adidas Predator Edge",
    categoria: "Chuteira",
    preco: 1299.90,
    imagem_ref: "predator",
    estoque: { loja_fisica: 0, centro_distribuicao: 8 }
  },
  {
    id: 3,
    nome: "Puma MB.02",
    categoria: "Basquete",
    preco: 999.90,
    imagem_ref: "pumaMB",
    estoque: { loja_fisica: 3, centro_distribuicao: 0 }
  }
];

export const api = {
  getProdutos: async () => {
    return new Promise((resolve) => setTimeout(() => resolve(mockProdutos), 500));
  },
  login: async (email, senha, tipo) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === "cliente@zenkai.com" && tipo === "cliente") {
          resolve({ token: "token-123", role: "cliente", nome: "Cliente" });
        } else if (email === "vendedor@zenkai.com" && tipo === "vendedor") {
          resolve({ token: "token-456", role: "vendedor", nome: "Vendedor" });
        } else {
          reject(new Error("Credenciais inválidas"));
        }
      }, 800);
    });
  }
};