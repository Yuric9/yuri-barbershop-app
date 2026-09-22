import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";

export const dynamic = "force-dynamic";

const services = [
  { title: "Corte masculino", description: "Precisão, estilo e acabamento limpo." },
  { title: "Barba", description: "Desenho, alinhamento e cuidado." },
  { title: "Corte + barba", description: "Experiência completa em um só atendimento." },
  { title: "Corte infantil", description: "Cuidado e atenção para os pequenos." },
  { title: "Acabamento e sobrancelha", description: "Detalhes que finalizam o visual." },
];

const gallery = [
  {
    className: "public-gallery-main",
    image:
      "https://images.unsplash.com/photo-1759134198561-e2041049419c?auto=format&fit=crop&q=82&w=1400",
    alt: "Barbeiros trabalhando em um salão moderno",
  },
  {
    className: "public-gallery-side",
    image:
      "https://images.unsplash.com/photo-1781455793310-8427c96454c7?auto=format&fit=crop&q=82&w=1000",
    alt: "Interior sofisticado de uma barbearia",
  },
  {
    className: "public-gallery-side public-gallery-bottom",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=82&w=1000",
    alt: "Cliente em uma cadeira de barbeiro",
  },
];

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="landing-shell public-landing">
        <header className="public-header">
          <a className="public-header-brand" href="/" aria-label="Yuri Barbershop — início">
            <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
          </a>
        </header>

        <section className="public-hero" aria-labelledby="public-home-title">
          <div className="public-hero-image" aria-hidden="true" />
          <div className="public-hero-overlay" aria-hidden="true" />
          <div className="public-hero-content">
            <span className="public-home-eyebrow">BEM-VINDO À</span>
            <h1 id="public-home-title">YURI BARBERSHOP</h1>
            <p className="public-hero-tagline">Estilo, precisão e cuidado em cada corte.</p>
            <div className="public-hero-actions">
              <a className="public-cta-primary" href="/agendamentos">AGENDAR MEU HORÁRIO <span aria-hidden="true">→</span></a>
              <a className="public-cta-secondary" href="#servicos">CONHECER SERVIÇOS <span aria-hidden="true">↓</span></a>
            </div>
            <p className="public-hero-support">Cortes masculinos, barba e acabamento profissional.</p>
          </div>
        </section>

        <section className="public-section public-services" id="servicos" aria-labelledby="servicos-title">
          <div className="public-section-heading">
            <span className="public-section-kicker">ESSENCIAL</span>
            <h2 id="servicos-title">Nossos Serviços</h2>
            <p>Um atendimento pensado para manter seu visual em dia.</p>
          </div>
          <div className="public-services-grid">
            {services.map((service, index) => (
              <article className="public-service-card" key={service.title}>
                <span className="public-service-number">0{index + 1}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
          <div className="public-services-action">
            <a className="public-cta-primary public-cta-small" href="/agendamentos">AGENDAR MEU HORÁRIO <span aria-hidden="true">→</span></a>
          </div>
        </section>

        <section className="public-section public-gallery-section" aria-labelledby="galeria-title">
          <div className="public-section-heading">
            <span className="public-section-kicker">A EXPERIÊNCIA</span>
            <h2 id="galeria-title">Nossa Barbearia</h2>
            <p>Ambiente, técnica e cuidado em cada detalhe.</p>
          </div>
          <div className="public-gallery">
            {gallery.map((item) => (
              <div
                className={`public-gallery-item ${item.className}`}
                key={item.image}
                role="img"
                aria-label={item.alt}
                style={{ backgroundImage: `url("${item.image}")` }}
              />
            ))}
          </div>
        </section>

        <section className="public-section public-hours" aria-labelledby="horarios-title">
          <div className="public-section-heading">
            <span className="public-section-kicker">HORÁRIOS</span>
            <h2 id="horarios-title">Quando estamos esperando por você</h2>
          </div>
          <div className="public-hours-grid">
            <div><span>SEG — SEX</span><strong>18h às 20h30</strong></div>
            <div><span>SÁBADO</span><strong>8h às 20h30</strong></div>
            <div><span>DOMINGO</span><strong>8h às 12h</strong></div>
          </div>
        </section>

        <footer className="public-home-footer">
          <span>© Yuri Barbershop</span>
          <span>Estilo, precisão e cuidado.</span>
          <a href="/privacidade">Privacidade e proteção de dados</a>
          <a href="/acesso-administrativo">Acesso administrativo</a>
        </footer>
      </main>
    );
  }

  return <PortalClient user={{ name: user.displayName, email: user.email }} role={user.role === "admin" || isAdminEmail(user.email) ? "admin" : user.role === "barber" ? "barber" : "client"} />;
}
