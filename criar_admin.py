import sqlite3
import bcrypt

conn = sqlite3.connect("zenkai_database.db")
cursor = conn.cursor()

senha_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

try:
    cursor.execute("""
        INSERT INTO Cliente (Nome, Email, Senha, Tipo_Cliente, Role)
        VALUES (?, ?, ?, ?, ?)
    """, ("Vendedor Master", "admin@zenkai.com", senha_hash, "PF", "ADMIN"))
    
    conn.commit()
    print(" Conta Admin criada com sucesso!")
    print(" Email: admin@zenkai.com")
    print(" Senha: admin123")
except sqlite3.IntegrityError:
    print(" A conta admin@zenkai.com já existe no seu banco de dados!")

conn.close()