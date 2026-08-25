#  Zenkai Store - E-commerce & PDV System

Um sistema corporativo Full-Stack que une uma Loja Virtual para consumidores finais a um robusto sistema de Frente de Caixa (PDV) e Gestão de Estoque para a loja física.

##  Funcionalidades Principais

**Para o Cliente (Online):**
* Vitrine dinâmica com filtros e busca.
* Carrinho de compras persistente (via LocalStorage).
* Fluxo de autenticação embutido no checkout (Login/Cadastro na mesma tela).
* Área "Minha Conta" para acompanhamento de status de pedidos e edição de dados.

**Para o Administrador (Loja Física / Backoffice):**
* **Terminal PDV:** Adição ágil de itens com seleção de tamanhos (SKU), aplicação de descontos (limitado a 50%) e cálculos automáticos de troco.
* **Pagamentos:** Suporte a transações em Dinheiro, Cartão (com parcelamento) e PIX.
* **Emissão de Recibo:** Geração automática de cupom não-fiscal formatado para impressoras térmicas.
* **Gestão de Estoque (CRUD):** Cadastro e edição de produtos, controle de grade de tamanhos, upload de imagens e gerenciamento de categorias.
* **Dashboard BI:** Métricas de faturamento em tempo real, ticket médio, gráfico de formas de pagamento e ranking de produtos mais vendidos.
* **CRM Integrado:** Busca inteligente de clientes e opção de cadastro rápido no balcão físico.
* **Histórico de Vendas:** Consulta de recibos anteriores e função de estorno (cancelamento com devolução automática do produto à prateleira).

##  Tecnologias e Arquitetura

O projeto foi construído separando as responsabilidades de cliente e servidor (API RESTful):

* **Backend:** Python 3, FastAPI, SQLite3 (Banco de Dados Relacional).
* **Segurança:** Hashes de senha com `Bcrypt` e autenticação de sessões via `PyJWT`.
* **Frontend:** React (criado com Vite), Tailwind CSS (estilização) e Lucide React (ícones).

##  Instalação e Execução (Windows / Linux)

### 1. Preparando o Servidor Backend (FastAPI)
Abra o terminal na raiz do projeto e crie o ambiente virtual:
```bash
# Criar o ambiente
python -m venv venv

# Ativar o ambiente (Windows)
.\venv\Scripts\activate
# Ativar o ambiente (Linux/Mac)
source venv/bin/activate

# Instalar dependências
pip install fastapi uvicorn bcrypt pyjwt python-multipart pydantic

# Iniciar o servidor
uvicorn main:app --reload

```
### 2. Criando o Administrador
```bash
pythob criar_admin.py

#(Isso garantirá a criação do usuário admin@zenkai.com com privilégios de acesso ao PDV).
```

### 3. Iniciando o Frontend
```bash
npm install
npm run dev
```
Acesse http://localhost:5173 em seu navegador para ver a loja virtual. Para acessar o Painel Administrativo, clique em Entrar e faça login com as credenciais geradas no passo 2.

### Documentação da API

A API do backend é auto-documentada. Com o servidor rodando, acesse a interface interativa do Swagger em: http://localhost:8000/docs


