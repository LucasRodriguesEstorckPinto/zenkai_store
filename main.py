from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import jwt
import datetime
import sqlite3
import bcrypt
import os
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/img", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

api_router = APIRouter(prefix='/zenkai/api')
SECRET_KEY = "sua_chave_secreta_super_segura_32_bytes"
security = HTTPBearer()
DB_PATH = "zenkai_database.db"

# --- INICIALIZAÇÃO BLINDADA DO BANCO DE DADOS ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Cliente (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            role TEXT DEFAULT 'CLIENTE'
        );
        CREATE TABLE IF NOT EXISTS Produto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            estoque INTEGER NOT NULL DEFAULT 0,
            categoria TEXT NOT NULL,
            imagem TEXT
        );
        CREATE TABLE IF NOT EXISTS Pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'Aprovado',
            data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES Cliente(id)
        );
        CREATE TABLE IF NOT EXISTS ItensPedido (
            pedido_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade INTEGER NOT NULL,
            preco_unitario REAL NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES Pedido(id),
            FOREIGN KEY (produto_id) REFERENCES Produto(id)
        );
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

# --- MODELOS ---
class UsuarioAuth(BaseModel):
    nome: Optional[str] = None
    email: str
    senha: str
    role: str = "CLIENTE"

class ItemCarrinho(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float

class CheckoutPayload(BaseModel):
    total: float
    itens: List[ItemCarrinho]

def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Sessão inválida. Refaça o login.")

# --- ROTAS ---
@api_router.post('/cadastro')
async def cadastrar(user: UsuarioAuth):
    hash_senha = bcrypt.hashpw(user.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db()
    try:
        conn.execute("INSERT INTO Cliente (nome, email, senha, role) VALUES (?, ?, ?, ?)",
                     (user.nome, user.email, hash_senha, user.role))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    finally:
        conn.close()
    return {"message": "Criado com sucesso"}

@api_router.post('/login')
async def login(user: UsuarioAuth):
    conn = get_db()
    user_db = conn.execute("SELECT * FROM Cliente WHERE email = ?", (user.email,)).fetchone()
    conn.close()

    if not user_db or not bcrypt.checkpw(user.senha.encode('utf-8'), user_db["senha"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    payload = {
        "id": user_db["id"], "email": user_db["email"], 
        "nome": user_db["nome"], "role": user_db["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return {"token": jwt.encode(payload, SECRET_KEY, algorithm="HS256"), "role": user_db["role"], "nome": user_db["nome"]}

@api_router.get('/produtos')
async def listar_produtos():
    conn = get_db()
    produtos = conn.execute("SELECT * FROM Produto").fetchall()
    conn.close()
    return [dict(p) for p in produtos]

@api_router.post('/produtos/cadastro')
async def cadastrar_produto(
    nome: str = Form(...), descricao: str = Form(""), preco: float = Form(...),
    estoque: int = Form(...), categoria: str = Form(...),
    imagem: Optional[UploadFile] = File(None), user=Depends(get_user_from_token)
):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    
    img_path = None
    if imagem:
        filename = f"prod_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.{imagem.filename.split('.')[-1]}"
        full_path = os.path.join("static/img", filename)
        with open(full_path, "wb") as f: shutil.copyfileobj(imagem.file, f)
        img_path = f"http://localhost:8000/static/img/{filename}"

    conn = get_db()
    conn.execute("INSERT INTO Produto (nome, descricao, preco, estoque, categoria, imagem) VALUES (?, ?, ?, ?, ?, ?)",
                 (nome, descricao, preco, estoque, categoria, img_path))
    conn.commit()
    conn.close()
    return {"message": "Sucesso"}

@api_router.delete('/produtos/{id}')
async def deletar_produto(id: int, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    conn.execute("DELETE FROM Produto WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Deletado"}

@api_router.post('/checkout')
async def finalizar_compra(pedido: CheckoutPayload, user=Depends(get_user_from_token)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Pedido (cliente_id, total) VALUES (?, ?)", (user["id"], pedido.total))
        pedido_id = cursor.lastrowid
        
        for item in pedido.itens:
            cursor.execute("INSERT INTO ItensPedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)",
                           (pedido_id, item.produto_id, item.quantidade, item.preco_unitario))
            cursor.execute("UPDATE Produto SET estoque = estoque - ? WHERE id = ?", (item.quantidade, item.produto_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    return {"message": "Compra finalizada"}

app.include_router(api_router)