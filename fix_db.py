import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Apaga a tabela velha
cursor.execute("DROP TABLE IF EXISTS Produto")

# Cria a tabela nova com todas as colunas necessárias
cursor.execute("""
CREATE TABLE Produto (
    ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL,
    Descricao TEXT,
    Preco REAL NOT NULL,
    Categoria TEXT NOT NULL,
    Estoque INTEGER NOT NULL,
    Imagem TEXT
)
""")

conn.commit()
conn.close()
print("✅ Tabela Produto zerada e recriada com sucesso!")