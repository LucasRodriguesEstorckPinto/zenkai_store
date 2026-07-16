from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt
import datetime
from passlib.context import CryptContext

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_PREFIX_NAME = 'zenkai'
API_PREFIX_NAME = 'api'
api_router = APIRouter(prefix=f'/{PROJECT_PREFIX_NAME}/{API_PREFIX_NAME}')

# Configurações de Segurança
SECRET_KEY = "sua_chave_secreta_super_segura"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Simulação do Banco de Dados em Memória
db_usuarios = []

# Mock de Tênis
db_tenis = [
    {"id": 1, "nome": "Nike Dunk Low Retro", "categoria": "Casual", "preco": 899.99, "descricao": "O ícone do basquete dos anos 80 retorna com detalhes clássicos.", "imagem_ref": "dunk_low"},
    {"id": 2, "nome": "Adidas Yeezy Boost 350 V2", "categoria": "Sneakerhead", "preco": 1499.00, "descricao": "Design inovador de Kanye West com tecnologia Boost.", "imagem_ref": "yeezy_350"},
    {"id": 3, "nome": "Air Jordan 1 High OG", "categoria": "Basquete", "preco": 1299.50, "descricao": "O tênis que começou tudo, em sua silhueta original.", "imagem_ref": "aj1_high"},
    {"id": 4, "nome": "Puma Suede Classic", "categoria": "Casual", "preco": 399.90, "descricao": "Clássico atemporal da Puma com cabedal em camurça.", "imagem_ref": "puma_suede"}
]

# Modelos Pydantic para validação de dados
class UsuarioCadastro(BaseModel):
    nome: str
    email: str
    senha: str
    role: str = "CLIENTE" # Pode ser CLIENTE ou ADMIN

class UsuarioLogin(BaseModel):
    email: str
    senha: str

@api_router.post('/cadastro')
async def cadastrar(usuario: UsuarioCadastro):
    for u in db_usuarios:
        if u["email"] == usuario.email:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    senha_hash = pwd_context.hash(usuario.senha)
    novo_usuario = {"nome": usuario.nome, "email": usuario.email, "senha": senha_hash, "role": usuario.role}
    db_usuarios.append(novo_usuario)
    return {"message": "Usuário cadastrado com sucesso!"}

@api_router.post('/login')
async def login(usuario: UsuarioLogin):
    user_db = next((u for u in db_usuarios if u["email"] == usuario.email), None)
    if not user_db or not pwd_context.verify(usuario.senha, user_db["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Gerando Token JWT
    payload = {
        "email": user_db["email"],
        "nome": user_db["nome"],
        "role": user_db["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    return {"token": token, "role": user_db["role"], "nome": user_db["nome"]}

@api_router.get('/produtos')
async def listar_produtos():
    return db_tenis

app.include_router(api_router)