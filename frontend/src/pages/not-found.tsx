import { Link } from "react-router-dom";
import { Empty, Heading } from "../components/common";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <>
      <Heading
        title="Página não encontrada"
        description="Este endereço não existe no console de administração."
      />
      <div className="panel">
        <Empty
          title="Vamos voltar ao painel?"
          description="Use a navegação para consultar namespaces, eventos ou tokens."
        >
          <Button asChild>
            <Link to="/">Ir para visão geral</Link>
          </Button>
        </Empty>
      </div>
    </>
  );
}
