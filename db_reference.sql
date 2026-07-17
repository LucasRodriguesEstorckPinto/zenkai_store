-- 1. Criação das Entidades Independentes

CREATE TABLE Categoria (
    ID_Categoria INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL,
    Descricao TEXT
);

CREATE TABLE Cliente (
    ID_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Senha TEXT NOT NULL,
    Telefone TEXT,
    Endereco TEXT,
    Data_Cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Tipo_Cliente TEXT CHECK(Tipo_Cliente IN ('PF', 'PJ')) NOT NULL, 
    Role TEXT CHECK(Role IN ('CLIENTE', 'ADMIN')) NOT NULL DEFAULT 'CLIENTE'
);

-- 2. Subclasses de Cliente

CREATE TABLE Pessoa_Fisica (
    ID_Cliente INTEGER PRIMARY KEY,
    CPF TEXT UNIQUE NOT NULL,
    Data_Nascimento DATE,
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE
);

CREATE TABLE Pessoa_Juridica (
    ID_Cliente INTEGER PRIMARY KEY,
    CNPJ TEXT UNIQUE NOT NULL,
    Razao_Social TEXT NOT NULL,
    Inscricao_Estadual TEXT,
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE
);

-- 3. Entidades Dependentes

CREATE TABLE Produto (
    ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_Categoria INTEGER NOT NULL,
    Nome TEXT NOT NULL,
    Descricao TEXT,
    Preco_Atual REAL NOT NULL,
    Quantidade_Estoque INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (ID_Categoria) REFERENCES Categoria(ID_Categoria)
);

CREATE TABLE Pedido (
    ID_Pedido INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_Cliente INTEGER NOT NULL,
    Data_Pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
    Status_Pedido TEXT NOT NULL,
    Valor_Total REAL NOT NULL,
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente)
);

-- 4. Entidade Associativa (N:M)

CREATE TABLE ItensPedido (
    ID_Pedido INTEGER NOT NULL,
    ID_Produto INTEGER NOT NULL,
    Quantidade INTEGER NOT NULL,
    Preco_Unitario REAL NOT NULL,
    PRIMARY KEY (ID_Pedido, ID_Produto), 
    FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido) ON DELETE CASCADE,
    FOREIGN KEY (ID_Produto) REFERENCES Produto(ID_Produto)
);

-- 5. Superclasse Pagamento

CREATE TABLE Pagamento (
    ID_Pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_Pedido INTEGER NOT NULL,
    Data_Hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    Valor REAL NOT NULL,
    Status TEXT NOT NULL,
    Tipo_Pagamento TEXT CHECK(Tipo_Pagamento IN ('CARTAO', 'PIX', 'BOLETO')) NOT NULL,
    FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido)
);

-- 6. Subclasses de Pagamento

CREATE TABLE Pagamento_Cartao (
    ID_Pagamento INTEGER PRIMARY KEY,
    Numero_Cartao TEXT NOT NULL, 
    Nome_Titular TEXT NOT NULL,
    Parcelas INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
);

CREATE TABLE Pagamento_Pix (
    ID_Pagamento INTEGER PRIMARY KEY,
    Chave_Pix TEXT NOT NULL,
    Codigo_Transacao TEXT UNIQUE NOT NULL,
    FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
);

CREATE TABLE Pagamento_Boleto (
    ID_Pagamento INTEGER PRIMARY KEY,
    Codigo_Barras TEXT UNIQUE NOT NULL,
    Data_Vencimento DATE NOT NULL,
    FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
);