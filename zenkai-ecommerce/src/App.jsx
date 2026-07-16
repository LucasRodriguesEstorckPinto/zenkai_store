
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LojaCliente from './pages/LojaCliente';
import PdvVendedor from './pages/PdvVendedor';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zenkai-bg text-zenkai-textMain font-sans selection:bg-zenkai-neonBlue/30">
        <Routes>
          {/* Rota inicial: Porta de entrada do sistema */}
          <Route path="/" element={<Login />} />
          
          {/* Rotas autenticadas simuladas */}
          <Route path="/loja" element={<LojaCliente />} />
          <Route path="/pdv" element={<PdvVendedor />} />

          {/* Fallback: Redireciona rotas inexistentes para o Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;