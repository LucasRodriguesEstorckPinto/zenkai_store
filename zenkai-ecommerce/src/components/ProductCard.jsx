
import { ShoppingCart } from 'lucide-react';

export default function ProductCard({ produto, onAdicionar }) {
  return (
    <div className="bg-zenkai-surface border border-zenkai-border rounded-xl overflow-hidden flex flex-col transition-transform hover:scale-[1.02] hover:border-zenkai-neonBlue/50 duration-300">
      
      {/* Imagem do Produto (Aqui entrarão as fotos da pasta assets no futuro) */}
      <div className="h-48 bg-[#111] flex items-center justify-center p-4 relative">
        <img 
          src={produto.imagem_url} 
          alt={produto.nome} 
          className="max-h-full object-contain drop-shadow-2xl"
        />
        {/* Badge de Categoria */}
        <span className="absolute top-3 left-3 bg-black/60 text-zenkai-textMuted text-xs px-2 py-1 rounded border border-zenkai-border">
          {produto.categoria}
        </span>
      </div>

      {/* Informações e Ação */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg mb-1">{produto.nome}</h3>
        <p className="text-zenkai-neonBlue font-mono font-bold text-xl mb-4">
          R$ {produto.preco.toFixed(2)}
        </p>
        
        <div className="mt-auto">
          <button 
            onClick={() => onAdicionar(produto)}
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-zenkai-neonBlue text-zenkai-neonBlue py-2.5 rounded-lg font-bold transition-all hover:bg-zenkai-neonBlue hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] active:scale-95"
          >
            <ShoppingCart size={18} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}