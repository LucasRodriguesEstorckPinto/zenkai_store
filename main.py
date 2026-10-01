from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import List, Optional
import jwt
import datetime
import sqlite3
import bcrypt
import os
import shutil
import json
import uuid
import traceback

app = FastAPI()

# --- REFINAMENTO DE SAÍDAS (TRATAMENTO DE ERROS GLOBAL) ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"sucesso": False, "erro": "Dados inválidos fornecidos.", "detalhes": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc() # Imprime no terminal para debug
    return JSONResponse(
        status_code=500,
        content={"sucesso": False, "erro": "Ocorreu um erro interno no servidor. A equipa técnica foi notificada."}
    )

# --- CONFIGURAÇÃO DE SEGURANÇA E CORS (DEPLOY) ---
ORIGENS_PERMITIDAS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENS_PERMITIDAS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/img", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

api_router = APIRouter(prefix='/zenkai/api')
SECRET_KEY = os.getenv("SECRET_KEY", "bd8196f1b82be24141ce28449f545c473d6f4d6154d082a837d910162f430c06")
security = HTTPBearer()
DB_PATH = "zenkai_database.db"

# --- INICIALIZAÇÃO DA BASE DE DADOS ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Categoria (ID_Categoria INTEGER PRIMARY KEY AUTOINCREMENT, Nome TEXT NOT NULL, Descricao TEXT);
        CREATE TABLE IF NOT EXISTS Cliente (ID_Cliente INTEGER PRIMARY KEY AUTOINCREMENT, Nome TEXT NOT NULL, Email TEXT UNIQUE NOT NULL, Senha TEXT NOT NULL, Telefone TEXT, Endereco TEXT, Data_Cadastro DATETIME DEFAULT CURRENT_TIMESTAMP, Tipo_Cliente TEXT CHECK(Tipo_Cliente IN ('PF', 'PJ')) NOT NULL DEFAULT 'PF', Role TEXT CHECK(Role IN ('CLIENTE', 'ADMIN')) NOT NULL DEFAULT 'CLIENTE');
        CREATE TABLE IF NOT EXISTS Pessoa_Fisica (ID_Cliente INTEGER PRIMARY KEY, CPF TEXT UNIQUE NOT NULL, Data_Nascimento DATE, FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS Pessoa_Juridica (ID_Cliente INTEGER PRIMARY KEY, CNPJ TEXT UNIQUE NOT NULL, Razao_Social TEXT NOT NULL, Inscricao_Estadual TEXT, FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE);
        
        -- Produto (Estoque e Tamanhos removidos, mantida apenas imagem de capa)
        CREATE TABLE IF NOT EXISTS Produto (ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT, ID_Categoria INTEGER, Nome TEXT NOT NULL, Descricao TEXT, Preco_Atual REAL NOT NULL, imagem TEXT, FOREIGN KEY (ID_Categoria) REFERENCES Categoria(ID_Categoria));
        
        -- Produto Variante (Gere Cores, Tamanhos, Estoque Exato e Imagem da Cor)
        CREATE TABLE IF NOT EXISTS Produto_Variante (ID_Variante INTEGER PRIMARY KEY AUTOINCREMENT, ID_Produto INTEGER NOT NULL, Cor TEXT NOT NULL, Tamanho TEXT NOT NULL, Quantidade_Estoque INTEGER NOT NULL DEFAULT 0, Imagem TEXT, UNIQUE(ID_Produto, Cor, Tamanho), FOREIGN KEY (ID_Produto) REFERENCES Produto(ID_Produto) ON DELETE CASCADE);
        
        CREATE TABLE IF NOT EXISTS Pedido (ID_Pedido INTEGER PRIMARY KEY AUTOINCREMENT, ID_Cliente INTEGER NOT NULL, Data_Pedido DATETIME DEFAULT CURRENT_TIMESTAMP, Status_Pedido TEXT NOT NULL DEFAULT 'Aprovado', Valor_Total REAL NOT NULL, FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente));
        
        -- ItensPedido atualizado com a coluna 'cor'
        CREATE TABLE IF NOT EXISTS ItensPedido (ID_Pedido INTEGER NOT NULL, ID_Produto INTEGER NOT NULL, cor TEXT NOT NULL, tamanho TEXT NOT NULL, Quantidade INTEGER NOT NULL, Preco_Unitario REAL NOT NULL, PRIMARY KEY (ID_Pedido, ID_Produto, cor, tamanho), FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido) ON DELETE CASCADE, FOREIGN KEY (ID_Produto) REFERENCES Produto(ID_Produto));
        
        CREATE TABLE IF NOT EXISTS Pagamento (ID_Pagamento INTEGER PRIMARY KEY AUTOINCREMENT, ID_Pedido INTEGER NOT NULL, Data_Hora DATETIME DEFAULT CURRENT_TIMESTAMP, Valor REAL NOT NULL, Status TEXT NOT NULL, Tipo_Pagamento TEXT CHECK(Tipo_Pagamento IN ('CARTAO', 'PIX', 'DINHEIRO')) NOT NULL, FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido));
        CREATE TABLE IF NOT EXISTS Pagamento_Cartao (ID_Pagamento INTEGER PRIMARY KEY, Numero_Cartao TEXT NOT NULL, Nome_Titular TEXT NOT NULL, Parcelas INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS Pagamento_Pix (ID_Pagamento INTEGER PRIMARY KEY, Chave_Pix TEXT NOT NULL, Codigo_Transacao TEXT UNIQUE NOT NULL, FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE);
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

# --- MODELOS PYDANTIC ---
class UsuarioAuth(BaseModel):
    nome: Optional[str] = None
    email: str
    senha: Optional[str] = None
    telefone: Optional[str] = None
    role: str = "CLIENTE"
    endereco: Optional[str] = None

class ItemCarrinho(BaseModel):
    produto_id: int
    cor: str
    tamanho: str
    quantidade: int
    preco_unitario: float

class PagamentoInfo(BaseModel):
    metodo: str
    valor_recebido: float
    parcelas: Optional[int] = 1

class CheckoutPayload(BaseModel):
    total: float
    desconto: float = 0.0
    cliente_id: Optional[int] = None
    itens: List[ItemCarrinho]
    pagamento: Optional[PagamentoInfo] = None

def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try: return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    except: raise HTTPException(status_code=401, detail="Sessão inválida. Refaça o login.")


# --- ROTAS DE AUTENTICAÇÃO E CLIENTE ---
@api_router.post('/cadastro')
async def cadastrar(user: UsuarioAuth):
    hash_senha = bcrypt.hashpw(user.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db()
    try:
        conn.execute("INSERT INTO Cliente (Nome, Email, Senha, Telefone, Role) VALUES (?, ?, ?, ?, ?)", (user.nome, user.email, hash_senha, user.telefone, user.role))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    finally: conn.close()
    return {"message": "Criado com sucesso"}

@api_router.post('/login')
async def login(user: UsuarioAuth):
    conn = get_db()
    user_db = conn.execute("SELECT * FROM Cliente WHERE Email = ?", (user.email,)).fetchone()
    conn.close()
    if not user_db or not bcrypt.checkpw(user.senha.encode('utf-8'), user_db["Senha"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    payload = {"id": user_db["ID_Cliente"], "email": user_db["Email"], "nome": user_db["Nome"], "role": user_db["Role"], "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)}
    return {"token": jwt.encode(payload, SECRET_KEY, algorithm="HS256"), "role": user_db["Role"], "nome": user_db["Nome"]}

@api_router.get('/clientes/buscar')
async def buscar_cliente(q: str, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    clientes = conn.execute("SELECT ID_Cliente as id, Nome as nome, Email as email, Telefone as telefone FROM Cliente WHERE Nome LIKE ? OR Email LIKE ? OR Telefone LIKE ? LIMIT 5", (f"%{q}%", f"%{q}%", f"%{q}%")).fetchall()
    conn.close()
    return [dict(c) for c in clientes]


# --- ROTAS DE PRODUTOS E VARIANTES ---
@api_router.get('/produtos')
async def listar_produtos():
    conn = get_db()
    query = """
        SELECT p.ID_Produto as id, p.Nome as nome, p.Descricao as descricao, p.Preco_Atual as preco, p.imagem, c.Nome as categoria,
               COALESCE(SUM(pv.Quantidade_Estoque), 0) as estoque
        FROM Produto p 
        LEFT JOIN Categoria c ON p.ID_Categoria = c.ID_Categoria
        LEFT JOIN Produto_Variante pv ON p.ID_Produto = pv.ID_Produto
        GROUP BY p.ID_Produto
    """
    produtos = conn.execute(query).fetchall()
    conn.close()
    return [dict(p) for p in produtos]

@api_router.get('/produtos/{id}')
async def obter_produto(id: int):
    conn = get_db()
    produto = conn.execute("""
        SELECT p.ID_Produto as id, p.Nome as nome, p.Descricao as descricao, 
               p.Preco_Atual as preco, p.imagem, c.Nome as categoria 
        FROM Produto p 
        LEFT JOIN Categoria c ON p.ID_Categoria = c.ID_Categoria 
        WHERE p.ID_Produto = ?
    """, (id,)).fetchone()
    
    if not produto: 
        conn.close()
        raise HTTPException(status_code=404, detail="Produto não localizado.")
    
    variantes = conn.execute("SELECT Cor, Tamanho, Quantidade_Estoque, Imagem FROM Produto_Variante WHERE ID_Produto = ?", (id,)).fetchall()
    conn.close()
    
    resultado = dict(produto)
    resultado["variantes"] = [dict(v) for v in variantes]
    return resultado

@api_router.post('/produtos/cadastro')
async def cadastrar_produto(request: Request, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    
    form = await request.form()
    nome = form.get("nome")
    descricao = form.get("descricao", "")
    preco = float(form.get("preco"))
    categoria = form.get("categoria")
    variantes_json = form.get("variantes")
    variantes = json.loads(variantes_json) if variantes_json else []

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT ID_Categoria FROM Categoria WHERE Nome = ?", (categoria,))
    cat = cursor.fetchone()
    cat_id = cat["ID_Categoria"] if cat else cursor.execute("INSERT INTO Categoria (Nome) VALUES (?)", (categoria,)).lastrowid

    cursor.execute("INSERT INTO Produto (Nome, Descricao, Preco_Atual, ID_Categoria, imagem) VALUES (?, ?, ?, ?, ?)", (nome, descricao, preco, cat_id, None))
    produto_id = cursor.lastrowid

    main_img_path = None

    for v in variantes:
        cor = v.get("cor")
        tamanhos = v.get("tamanhos", {})
        img_file = form.get(f"imagem_{cor}")
        
        cor_img_path = None
        if img_file and hasattr(img_file, "filename"):
            filename = f"var_{uuid.uuid4().hex}_{img_file.filename}"
            full_path = os.path.join("static/img", filename)
            with open(full_path, "wb") as f: shutil.copyfileobj(img_file.file, f)
            cor_img_path = f"http://localhost:8000/static/img/{filename}"
            
            if not main_img_path: # Define a primeira imagem enviada como a foto de capa do produto
                main_img_path = cor_img_path
                cursor.execute("UPDATE Produto SET imagem=? WHERE ID_Produto=?", (main_img_path, produto_id))
        
        for tamanho, qtd in tamanhos.items():
            cursor.execute("INSERT INTO Produto_Variante (ID_Produto, Cor, Tamanho, Quantidade_Estoque, Imagem) VALUES (?, ?, ?, ?, ?)", (produto_id, cor, tamanho, qtd, cor_img_path))
            
    conn.commit()
    conn.close()
    return {"message": "Produto e variantes criados com sucesso"}

@api_router.post('/produtos/editar/{id}')
async def editar_produto(id: int, request: Request, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    
    form = await request.form()
    nome = form.get("nome")
    descricao = form.get("descricao", "")
    preco = float(form.get("preco"))
    categoria = form.get("categoria")
    variantes_json = form.get("variantes")
    variantes = json.loads(variantes_json) if variantes_json else []

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT ID_Categoria FROM Categoria WHERE Nome = ?", (categoria,))
    cat = cursor.fetchone()
    cat_id = cat["ID_Categoria"] if cat else cursor.execute("INSERT INTO Categoria (Nome) VALUES (?)", (categoria,)).lastrowid

    cursor.execute("UPDATE Produto SET Nome=?, Descricao=?, Preco_Atual=?, ID_Categoria=? WHERE ID_Produto=?", (nome, descricao, preco, cat_id, id))

    # Mapear imagens existentes para não as perder caso o utilizador não envie uma nova
    existing_vars = cursor.execute("SELECT Cor, Imagem FROM Produto_Variante WHERE ID_Produto=?", (id,)).fetchall()
    img_map = {row["Cor"]: row["Imagem"] for row in existing_vars}

    cursor.execute("DELETE FROM Produto_Variante WHERE ID_Produto=?", (id,))
    
    main_img_path = None

    for v in variantes:
        cor = v.get("cor")
        tamanhos = v.get("tamanhos", {})
        img_file = form.get(f"imagem_{cor}")
        
        cor_img_path = img_map.get(cor) # Usa imagem anterior como default
        if img_file and hasattr(img_file, "filename"):
            filename = f"var_{uuid.uuid4().hex}_{img_file.filename}"
            full_path = os.path.join("static/img", filename)
            with open(full_path, "wb") as f: shutil.copyfileobj(img_file.file, f)
            cor_img_path = f"http://localhost:8000/static/img/{filename}"

        if cor_img_path and not main_img_path:
            main_img_path = cor_img_path
            
        for tamanho, qtd in tamanhos.items():
            cursor.execute("INSERT INTO Produto_Variante (ID_Produto, Cor, Tamanho, Quantidade_Estoque, Imagem) VALUES (?, ?, ?, ?, ?)", (id, cor, tamanho, qtd, cor_img_path))

    if main_img_path:
        cursor.execute("UPDATE Produto SET imagem=? WHERE ID_Produto=?", (main_img_path, id))

    conn.commit()
    conn.close()
    return {"message": "Produto atualizado com sucesso"}

@api_router.delete('/produtos/{id}')
async def deletar_produto(id: int, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    conn.execute("DELETE FROM Produto WHERE ID_Produto = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Deletado"}


# --- ROTAS DE VENDAS E DASHBOARD ---
@api_router.get('/dashboard')
async def obter_dashboard(user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    cursor = conn.cursor()
    faturamento_hoje = cursor.execute("SELECT SUM(Valor_Total) as total FROM Pedido WHERE date(Data_Pedido) = date('now') AND Status_Pedido != 'Cancelado'").fetchone()["total"] or 0.0
    faturamento_mes = cursor.execute("SELECT SUM(Valor_Total) as total FROM Pedido WHERE strftime('%Y-%m', Data_Pedido) = strftime('%Y-%m', 'now') AND Status_Pedido != 'Cancelado'").fetchone()["total"] or 0.0
    ticket_medio = cursor.execute("SELECT AVG(Valor_Total) as media FROM Pedido WHERE strftime('%Y-%m', Data_Pedido) = strftime('%Y-%m', 'now') AND Status_Pedido != 'Cancelado'").fetchone()["media"] or 0.0
    pagamentos_db = cursor.execute("SELECT Tipo_Pagamento, SUM(Valor) as total FROM Pagamento WHERE Status != 'Estornado' GROUP BY Tipo_Pagamento").fetchall()
    pagamentos = {p["Tipo_Pagamento"]: p["total"] for p in pagamentos_db}
    top_produtos = [{"nome": row["Nome"], "qtd": row["qtd"]} for row in cursor.execute("SELECT p.Nome, SUM(i.Quantidade) as qtd FROM ItensPedido i JOIN Produto p ON i.ID_Produto = p.ID_Produto JOIN Pedido ped ON i.ID_Pedido = ped.ID_Pedido WHERE ped.Status_Pedido != 'Cancelado' GROUP BY i.ID_Produto ORDER BY qtd DESC LIMIT 5").fetchall()]
    conn.close()
    return {"faturamento_hoje": faturamento_hoje, "faturamento_mes": faturamento_mes, "ticket_medio": ticket_medio, "pagamentos": pagamentos, "top_produtos": top_produtos}

@api_router.get('/pedidos')
async def listar_pedidos_admin(user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    cursor = conn.cursor()
    pedidos_db = cursor.execute("""
        SELECT p.ID_Pedido as id, p.Data_Pedido as data, p.Status_Pedido as status, p.Valor_Total as total,
               c.Nome as cliente, pag.Tipo_Pagamento as metodo_pgto
        FROM Pedido p 
        LEFT JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
        LEFT JOIN Pagamento pag ON p.ID_Pedido = pag.ID_Pedido
        ORDER BY p.ID_Pedido DESC
    """).fetchall()
    
    pedidos = []
    for ped in pedidos_db:
        p_dict = dict(ped)
        p_dict["itens"] = [dict(i) for i in cursor.execute("SELECT pr.Nome as nome, i.cor, i.tamanho, i.Quantidade as qtd, i.Preco_Unitario as preco FROM ItensPedido i JOIN Produto pr ON i.ID_Produto = pr.ID_Produto WHERE i.ID_Pedido = ?", (p_dict["id"],)).fetchall()]
        pedidos.append(p_dict)
    conn.close()
    return pedidos

@api_router.post('/pedidos/{id}/cancelar')
async def cancelar_pedido(id: int, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    cursor = conn.cursor()
    try:
        status = cursor.execute("SELECT Status_Pedido FROM Pedido WHERE ID_Pedido = ?", (id,)).fetchone()
        if not status or status["Status_Pedido"] == 'Cancelado':
            raise Exception("Pedido já cancelado ou inexistente.")

        # Devolver itens ao estoque correto (Cor e Tamanho)
        itens = cursor.execute("SELECT ID_Produto, cor, tamanho, Quantidade FROM ItensPedido WHERE ID_Pedido = ?", (id,)).fetchall()
        for item in itens:
            cursor.execute("UPDATE Produto_Variante SET Quantidade_Estoque = Quantidade_Estoque + ? WHERE ID_Produto = ? AND Cor = ? AND Tamanho = ?", (item["Quantidade"], item["ID_Produto"], item["cor"], item["tamanho"]))
        
        cursor.execute("UPDATE Pedido SET Status_Pedido = 'Cancelado' WHERE ID_Pedido = ?", (id,))
        cursor.execute("UPDATE Pagamento SET Status = 'Estornado' WHERE ID_Pedido = ?", (id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    return {"message": "Venda cancelada e estoque estornado com sucesso!"}

@api_router.post('/checkout')
async def finalizar_compra(pedido: CheckoutPayload, user=Depends(get_user_from_token)):
    if pedido.desconto > (pedido.total * 0.5): raise HTTPException(status_code=400, detail="Desconto não pode exceder 50%.")
    conn = get_db()
    cursor = conn.cursor()
    try:
        total_com_desconto = max(0, pedido.total - pedido.desconto)
        cliente_id = pedido.cliente_id
        if not cliente_id:
            cf = cursor.execute("SELECT ID_Cliente FROM Cliente WHERE Email = 'consumidor@final.com'").fetchone()
            if cf: cliente_id = cf["ID_Cliente"]
            else: cliente_id = cursor.execute("INSERT INTO Cliente (Nome, Email, Senha, Role) VALUES ('Consumidor Final', 'consumidor@final.com', '123456', 'CLIENTE')").lastrowid

        pedido_id = cursor.execute("INSERT INTO Pedido (ID_Cliente, Valor_Total, Status_Pedido) VALUES (?, ?, 'Aprovado')", (cliente_id, total_com_desconto)).lastrowid
        
        for item in pedido.itens:
            variante = cursor.execute("SELECT Quantidade_Estoque FROM Produto_Variante WHERE ID_Produto = ? AND Cor = ? AND Tamanho = ?", (item.produto_id, item.cor, item.tamanho)).fetchone()
            
            if not variante or variante["Quantidade_Estoque"] < item.quantidade:
                raise Exception(f"Estoque insuficiente para {item.cor} tamanho {item.tamanho}.")
                
            cursor.execute("UPDATE Produto_Variante SET Quantidade_Estoque = Quantidade_Estoque - ? WHERE ID_Produto = ? AND Cor = ? AND Tamanho = ?", (item.quantidade, item.produto_id, item.cor, item.tamanho))
            cursor.execute("INSERT INTO ItensPedido (ID_Pedido, ID_Produto, cor, tamanho, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?, ?, ?)", (pedido_id, item.produto_id, item.cor, item.tamanho, item.quantidade, item.preco_unitario))
        
        if pedido.pagamento:
            metodo = pedido.pagamento.metodo
            pagamento_id = cursor.execute("INSERT INTO Pagamento (ID_Pedido, Valor, Status, Tipo_Pagamento) VALUES (?, ?, 'Aprovado', ?)", (pedido_id, total_com_desconto, metodo)).lastrowid
            if metodo == 'CARTAO': cursor.execute("INSERT INTO Pagamento_Cartao (ID_Pagamento, Numero_Cartao, Nome_Titular, Parcelas) VALUES (?, '0000', 'PDV Físico', ?)", (pagamento_id, pedido.pagamento.parcelas))
            elif metodo == 'PIX': cursor.execute("INSERT INTO Pagamento_Pix (ID_Pagamento, Chave_Pix, Codigo_Transacao) VALUES (?, 'loja@pix.com', ?)", (pagamento_id, str(uuid.uuid4())))
                
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally: conn.close()
    return {"message": "Compra finalizada!"}


# --- ROTAS DA ÁREA DO CLIENTE ---
@api_router.get('/perfil/meus-pedidos')
async def meus_pedidos(user=Depends(get_user_from_token)):
    conn = get_db()
    cursor = conn.cursor()
    pedidos_db = cursor.execute("SELECT p.ID_Pedido as id, p.Data_Pedido as data, p.Status_Pedido as status, p.Valor_Total as total FROM Pedido p WHERE p.ID_Cliente = ? ORDER BY p.ID_Pedido DESC", (user["id"],)).fetchall()
    pedidos = []
    for ped in pedidos_db:
        p_dict = dict(ped)
        p_dict["itens"] = [dict(i) for i in cursor.execute("SELECT pr.Nome as nome, i.cor, i.tamanho, i.Quantidade as qtd, i.Preco_Unitario as preco, pr.imagem FROM ItensPedido i JOIN Produto pr ON i.ID_Produto = pr.ID_Produto WHERE i.ID_Pedido = ?", (p_dict["id"],)).fetchall()]
        pedidos.append(p_dict)
    conn.close()
    return pedidos

@api_router.get('/perfil/dados')
async def dados_perfil(user=Depends(get_user_from_token)):
    conn = get_db()
    cliente = conn.execute("SELECT Nome as nome, Email as email, Telefone as telefone, Endereco as endereco FROM Cliente WHERE ID_Cliente = ?", (user["id"],)).fetchone()
    conn.close()
    return dict(cliente) if cliente else {}

@api_router.put('/perfil/atualizar')
async def atualizar_perfil(dados: UsuarioAuth, user=Depends(get_user_from_token)):
    conn = get_db()
    try:
        conn.execute("UPDATE Cliente SET Nome = ?, Telefone = ?, Endereco = ? WHERE ID_Cliente = ?", (dados.nome, dados.telefone, dados.endereco, user["id"]))
        conn.commit()
    finally: conn.close()
    return {"message": "Perfil atualizado!"}

app.include_router(api_router)