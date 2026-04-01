// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';


function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zenkai-bg text-zenkai-textMain font-sans selection:bg-zenkai-neonBlue/30">
        <Routes>
          {/* Rota inicial é o Login */}
          <Route path="/" element={<Login />} />
          
          {/* Rotas futuras (deixamos preparadas) */}
          {/* <Route path="/loja" element={<LojaCliente />} /> */}
          {/* <Route path="/pdv" element={<PdvVendedor />} /> */}

          {/* Se o usuário digitar uma URL que não existe, volta pro login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;