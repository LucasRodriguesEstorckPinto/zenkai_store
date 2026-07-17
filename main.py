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

# Permite o Frontend acessar o Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cria o diretório para salvar as imagens dos produtos, se não existir
os.makedirs("static/img", exist_ok=True)

# Monta a pasta static para servir as imagens publicamente no navegador
app.mount("/static", StaticFiles(directory="static"), name="static")

PROJECT_PREFIX_NAME = 'zenkai'
API_PREFIX_NAME = 'api'
api_router = APIRouter(prefix=f'/{PROJECT_PREFIX_NAME}/{API_PREFIX_NAME}')

# Configurações de Segurança
SECRET_KEY = "sua_chave_secreta_super_segura_32_bytes"
security = HTTPBearer()

# Caminho do banco de dados
DB_PATH = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

# --- MODELOS PYDANTIC ---
class UsuarioCadastro(BaseModel):
    nome: str
    email: str
    senha: str
    role: str = "CLIENTE"
    tipo_cliente: str = "PF" 

class UsuarioLogin(BaseModel):
    email: str
    senha: str

class ItemPedido(BaseModel):
    produto_id: int
    quantidade: int
    tipo_entrega: str
    preco_unitario: float

class PedidoCheckout(BaseModel):
    total: float
    itens: List[ItemPedido]

# --- DEPENDÊNCIAS DE SEGURANÇA ---
def verificar_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Lê o token do cabeçalho da requisição e retorna os dados do usuário"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token de acesso inválido.")

# --- ROTAS DE AUTENTICAÇÃO ---
@api_router.post('/cadastro')
async def cadastrar(usuario: UsuarioCadastro):
    senha_hash = bcrypt.hashpw(usuario.senha.encode('utf-8'), bcrypt.gensalt())
    senha_hash_str = senha_hash.decode('utf-8')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            INSERT INTO Cliente (Nome, Email, Senha, Tipo_Cliente, Role) 
            VALUES (?, ?, ?, ?, ?)
            """,
            (usuario.nome, usuario.email, senha_hash_str, usuario.tipo_cliente, usuario.role)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email já cadastrado no sistema")
    
    conn.close()
    return {"message": "Usuário cadastrado com sucesso!"}

@api_router.post('/login')
async def login(usuario: UsuarioLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM Cliente WHERE Email = ?", (usuario.email,))
    user_db = cursor.fetchone()
    conn.close()

    if not user_db or not bcrypt.checkpw(usuario.senha.encode('utf-8'), user_db["Senha"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Convertendo o sqlite3.Row para um dicionário real do Python
    user_dict = dict(user_db)
    
    payload = {
        "id_cliente": user_dict.get("ID_Cliente", user_dict.get("id")), 
        "email": user_dict["Email"],
        "nome": user_dict["Nome"],
        "role": user_dict["Role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=4)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    return {"token": token, "role": user_dict["Role"], "nome": user_dict["Nome"]}

# --- ROTAS DE PRODUTOS ---
@api_router.get('/produtos')
async def listar_produtos():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Produto")
    produtos_db = cursor.fetchall()
    conn.close()
    
    lista_formatada = []
    for p in produtos_db:
        prod = dict(p)
        # Adaptando a estrutura plana do SQLite para o formato aninhado que o React espera
        lista_formatada.append({
            "id": prod.get("ID_Produto", prod.get("id")),
            "nome": prod.get("Nome", "Sem Nome"),
            "descricao": prod.get("Descricao", ""),
            "preco": float(prod.get("Preco", 0)),
            "categoria": prod.get("Categoria", "Geral"),
            "imagem": f"http://localhost:8000{prod.get('Imagem')}" if prod.get('Imagem') else None,
            "estoque": {
                "loja_fisica": int(prod.get("Estoque", 0)),
                "online": int(prod.get("Estoque", 0))
            }
        })
        
    return lista_formatada

@api_router.post('/produtos/cadastro')
async def cadastrar_produto(
    nome: str = Form(...),
    descricao: str = Form(""),
    preco: float = Form(...),
    categoria: str = Form(...),
    estoque: int = Form(...),
    imagem: Optional[UploadFile] = File(None),
    usuario_atual: dict = Depends(verificar_token)
):
    # Proteção de Rota: Apenas Vendedores (ADMIN) podem cadastrar produtos
    if usuario_atual.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas vendedores podem cadastrar produtos.")

    caminho_imagem_db = None
    
    # Processa o upload do arquivo físico
    if imagem:
        extensao = imagem.filename.split('.')[-1]
        nome_arquivo = f"prod_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.{extensao}"
        caminho_completo = os.path.join("static/img", nome_arquivo)
        
        with open(caminho_completo, "wb") as buffer:
            shutil.copyfileobj(imagem.file, buffer)
            
        caminho_imagem_db = f"/static/img/{nome_arquivo}"

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # ATENÇÃO: Verifique se as colunas da sua tabela Produto tem esses exatos nomes.
        cursor.execute(
            """
            INSERT INTO Produto (Nome, Descricao, Preco, Categoria, Estoque, Imagem)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (nome, descricao, preco, categoria, estoque, caminho_imagem_db)
        )
        conn.commit()
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar produto no banco: {str(e)}")
    
    conn.close()
    return {"message": "Produto cadastrado com sucesso!"}

# --- ROTAS DE CHECKOUT / PEDIDOS ---
@api_router.post('/checkout')
async def finalizar_checkout(pedido: PedidoCheckout, usuario_atual: dict = Depends(verificar_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        data_atual = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        id_cliente = usuario_atual.get("id_cliente")

        # 1. Cria o Pedido principal
        cursor.execute(
            """
            INSERT INTO Pedido (Data_Pedido, Valor_Total, Status, ID_Cliente) 
            VALUES (?, ?, ?, ?)
            """,
            (data_atual, pedido.total, 'Aprovado', id_cliente)
        )
        pedido_id = cursor.lastrowid
        
        # 2. Registra o Pagamento (Simulação)
        cursor.execute(
            """
            INSERT INTO Pagamento (Valor, Metodo_Pagamento, Status_Pagamento, Data_Pagamento, ID_Pedido) 
            VALUES (?, ?, ?, ?, ?)
            """,
            (pedido.total, 'Cartão/Pix Dev', 'Aprovado', data_atual, pedido_id)
        )

        # 3. Adiciona os itens e reduz o estoque
        for item in pedido.itens:
            # Baixa no estoque
            cursor.execute(
                "UPDATE Produto SET Estoque = Estoque - ? WHERE ID_Produto = ?", 
                (item.quantidade, item.produto_id)
            )
            
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Erro ao processar checkout: {str(e)}")
        
    conn.close()
    return {"message": "Compra finalizada com sucesso", "pedido_id": pedido_id}

app.include_router(api_router)