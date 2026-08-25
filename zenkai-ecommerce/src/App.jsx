import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LojaCliente from './pages/LojaCliente';
import PdvVendedor from './pages/PdvVendedor';
import ProdutoDetalhe from './pages/ProdutoDetalhe';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* A PÁGINA INICIAL (RAIZ)*/}
        <Route path="/" element={<LojaCliente />} />
        
        {/* ROTA DO PRODUTO (Mantemos igual) */}
        <Route path="/produto/:id" element={<ProdutoDetalhe />} />
        
        {/* ROTA DO PDV DO ADMIN */}
        <Route path="/pdv" element={<PdvVendedor />} />

        {/* REDIRECIONA QUALQUER ROTA INEXISTENTE PARA A LOJA */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}