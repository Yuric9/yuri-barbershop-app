import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { isAdminEmail } from "../admin-access";

export const dynamic = "force-dynamic";

export default async function BarberPreviewPage() {
  const user = await getChatGPTUser();
  if (!user) redirect("/");
  if (user.role !== "admin" && !isAdminEmail(user.email)) redirect("/");

  return (
    <main className="barber-preview-shell">
      <aside className="barber-preview-sidebar">
        <a href="/" className="barber-preview-logo" aria-label="Voltar ao painel administrativo">
          <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
        </a>
        <nav>
          <button className="active"><span>⌂</span>Meu painel</button>
          <button><span>✉</span>Caixa de entrada</button>
          <button><span>□</span>Minha agenda</button>
          <button><span>↗</span>Meus ganhos</button>
          <button><span>◉</span>Meu perfil</button>
        </nav>
        <div className="barber-preview-user">
          <b>C</b>
          <div><strong>Colaborador</strong><small>Barbeiro colaborador</small></div>
        </div>
        <a className="barber-preview-back" href="/">← Voltar ao Admin</a>
      </aside>

      <section className="barber-preview-content">
        <header>
          <div><small>PRÉ-VISUALIZAÇÃO ADMINISTRATIVA</small><h1>Meu painel</h1></div>
          <span>Somente você vê esta simulação</span>
        </header>

        <div className="barber-preview-role">
          <div><small>✂ ÁREA DO COLABORADOR</small><strong>Meu painel</strong><p>Agenda, próximos clientes e ganhos do trabalho em um único lugar.</p></div>
          <em>ACESSO RESTRITO</em>
        </div>

        <section className="barber-preview-hero">
          <div><small>BOM TRABALHO</small><h2>Seu dia na Yuri Barbershop</h2><p>Esta é a experiência que o colaborador verá ao entrar com a própria conta.</p></div>
          <span>Hoje</span>
        </section>

        <div className="barber-preview-metrics">
          <article className="featured"><small>ATENDIMENTOS HOJE</small><strong>3</strong><span>1 próximo cliente</span></article>
          <article><small>GANHOS DE HOJE</small><strong>R$ 42,00</strong><span>Comissões finalizadas</span></article>
          <article><small>GANHOS DO MÊS</small><strong>R$ 684,00</strong><span>Acumulado do período</span></article>
          <article><small>PRÓXIMO CLIENTE</small><strong>18:30</strong><span>Corte + barba</span></article>
        </div>

        <div className="barber-preview-grid">
          <section className="barber-preview-panel">
            <div className="barber-preview-panel-head"><div><small>MINHA AGENDA</small><h3>Próximos atendimentos</h3></div><button>Ver agenda</button></div>
            <div className="barber-preview-appointment"><time>18:30</time><b>JS</b><div><strong>João Silva</strong><small>Corte + barba</small></div><span>Confirmado</span></div>
            <div className="barber-preview-appointment"><time>19:30</time><b>RM</b><div><strong>Rafael Martins</strong><small>Corte</small></div><span className="pending">Pendente</span></div>
          </section>

          <section className="barber-preview-panel">
            <div className="barber-preview-panel-head"><div><small>MEUS GANHOS</small><h3>Resumo de comissão</h3></div></div>
            <div className="barber-preview-earning"><span>Atendimentos finalizados</span><strong>18</strong></div>
            <div className="barber-preview-earning"><span>Percentual padrão</span><strong>40%</strong></div>
            <div className="barber-preview-earning"><span>Comissões acumuladas</span><strong>R$ 684,00</strong></div>
          </section>
        </div>

        <div className="barber-preview-note">
          <strong>O colaborador não terá acesso administrativo.</strong>
          <span>Sem Caixa geral, Clientes, Relatórios, Remarketing, Serviços, Produtos, Promoções, Assinaturas/Clube Yuri, Mercado Pago ou configurações da empresa.</span>
        </div>
      </section>
    </main>
  );
}
