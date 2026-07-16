import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LojaCliente from './pages/LojaCliente';
import PdvVendedor from './pages/PdvVendedor';

// Componente "Guarda de Rota" para proteger o acesso
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // 1. Se o usuário não tem token (não está logado), é expulso para o Login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 2. Se a rota exige uma permissão específica (ex: ADMIN) e o usuário não a tem, vai para a Loja
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/loja" replace />;
  }

  // 3. Se passou nas verificações, o componente da página é renderizado normalmente
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zenkai-bg text-zenkai-textMain font-sans selection:bg-zenkai-neonBlue/30">
        <Routes>
          {/* Rota pública: Porta de entrada do sistema */}
          <Route path="/" element={<Login />} />
          
          {/* Rota autenticada geral: Qualquer usuário logado pode acessar */}
          <Route 
            path="/loja" 
            element={
              <ProtectedRoute>
                <LojaCliente />
              </ProtectedRoute>
            } 
          />
          
          {/* Rota Restrita: Apenas usuários com a role 'ADMIN' conseguem acessar */}
          <Route 
            path="/pdv" 
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <PdvVendedor />
              </ProtectedRoute>
            } 
          />

          {/* Fallback: Redireciona qualquer URL inventada ou quebrada para o Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;