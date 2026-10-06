from fastapi.testclient import TestClient
from main import app  # Importa a sua aplicação FastAPI

# Inicializa o cliente de testes
client = TestClient(app)

def test_listar_produtos_retorna_lista():
    """Testa se a rota GET /produtos retorna status 200 e uma lista"""
    response = client.get("/zenkai/api/produtos")
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_bloqueio_desconto_abusivo():
    """Testa a trava de segurança que impede descontos maiores que 50%"""
    payload_venda = {
        "total": 100.00,
        "desconto": 60.00, # Desconto de 60% (deve falhar)
        "itens": []
    }
    
    response = client.post("/zenkai/api/checkout", json=payload_venda)
    
    # O sistema deve bloquear com erro 400 Bad Request
    assert response.status_code == 400
    assert "não pode exceder 50%" in response.json()["detail"]