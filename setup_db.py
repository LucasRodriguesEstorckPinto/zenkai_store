import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# 1. Cria a Tabela Cliente
cursor.execute("""
CREATE TABLE IF NOT EXISTS Cliente (
    ID_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Senha TEXT NOT NULL,
    Tipo_Cliente TEXT NOT NULL,
    Role TEXT NOT NULL
)
""")

# 2. Cria a Tabela Produto (Já com a coluna Imagem!)
cursor.execute("""
CREATE TABLE IF NOT EXISTS Produto (
    ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL,
    Descricao TEXT,
    Preco REAL NOT NULL,
    Categoria TEXT NOT NULL,
    Estoque INTEGER NOT NULL,
    Imagem TEXT
)
""")

# 3. Cria a Tabela Pedido
cursor.execute("""
CREATE TABLE IF NOT EXISTS Pedido (
    ID_Pedido INTEGER PRIMARY KEY AUTOINCREMENT,
    Data_Pedido TEXT NOT NULL,
    Valor_Total REAL NOT NULL,
    Status TEXT NOT NULL,
    ID_Cliente INTEGER NOT NULL,
    FOREIGN KEY(ID_Cliente) REFERENCES Cliente(ID_Cliente)
)
""")

# 4. Cria a Tabela Pagamento
cursor.execute("""
CREATE TABLE IF NOT EXISTS Pagamento (
    ID_Pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
    Valor REAL NOT NULL,
    Metodo_Pagamento TEXT NOT NULL,
    Status_Pagamento TEXT NOT NULL,
    Data_Pagamento TEXT NOT NULL,
    ID_Pedido INTEGER NOT NULL,
    FOREIGN KEY(ID_Pedido) REFERENCES Pedido(ID_Pedido)
)
""")

conn.commit()
conn.close()
