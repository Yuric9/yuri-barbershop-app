"use client";

import { useEffect, useState } from "react";

const WHATSAPP_NUMBER = "5562981007636";
const WHATSAPP_BASE = `https://wa.me/${WHATSAPP_NUMBER}`;
const INSTAGRAM_URL = "https://www.instagram.com/yuricbarbearia";
const GOOGLE_REVIEW_URL = "https://g.page/r/CaO2Z7is9bPgEAE/review";
const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/fSRqRd1iQVJbDej16";

type Service = { id: number; name: string; price: number; time: string };
type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  imageKey?: string;
  stock: number;
};
type Collaborator = { id: number; name: string; active: boolean };

function money(value: number) {
  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function storedImage(key?: string) {
  return key ? `/api/upload?key=${encodeURIComponent(key)}` : "";
}

function bookingTimesForDate(date: string) {
  if (!date) return [];
  const day = new Date(`${date}T12:00:00`).getDay();
  const startMinutes = day === 0 || day === 6 ? 8 * 60 : 18 * 60;
  const endMinutes = day === 0 ? 12 * 60 : 20 * 60 + 30;
  const slots: string[] = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return slots;
}

export default function PublicVisitorShell({ section }: { section: "agendar" | "produtos" }) {
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/data")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setServices(
          (data.services || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.priceCents / 100,
            time: `${item.durationMin} min`,
          })),
        );
        setProducts(
          (data.products || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.priceCents / 100,
            description: item.description,
            imageKey: item.imageKey,
            stock: item.stock,
          })),
        );
        setCollaborators(data.collaborators || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Não foi possível carregar as informações agora. Tente novamente em instantes.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="visitor-shell">
      <VisitorHeader active={section} />
      <div className="visitor-content">
        {section === "agendar" ? (
          <BookingFlow services={services} collaborators={collaborators} loading={loading} error={error} />
        ) : (
          <ProductGallery products={products} loading={loading} error={error} />
        )}
      </div>
    </main>
  );
}

function VisitorHeader({ active }: { active: "agendar" | "produtos" }) {
  return (
    <header className="visitor-header">
      <a className="visitor-brand" href="/" aria-label="Yuri Barbershop — início">
        <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
      </a>
      <nav className="visitor-nav" aria-label="Navegação">
        <a href="/agendamentos" className={active === "agendar" ? "active" : ""}>Agendar</a>
        <a href="/produtos" className={active === "produtos" ? "active" : ""}>Produtos</a>
      </nav>
      <div className="visitor-contacts">
        <a href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Olá, vim pelo site da Yuri Barbershop.")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a12.7 12.7 0 0 0-11 19l-1.5 6 6.1-1.5A12.8 12.8 0 1 0 16 3Zm0 2.6a10.2 10.2 0 0 1 0 20.4c-1.8 0-3.5-.5-5-1.3l-.6-.3-3.6.9.9-3.5-.4-.6A10.2 10.2 0 0 1 16 5.6Zm-4.8 4.8c-.3 0-.6.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.2.2 2.1 3.4 5.2 4.6 2.5 1 3.1.8 3.7.7.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.4-.3-.8-.5l-2.4-1.1c-.4-.2-.7-.3-1 .3l-1 1.2c-.2.3-.5.3-.9.1-1.2-.6-2.3-1.3-3.1-2.4-.2-.4 0-.6.2-.8l.7-.8c.2-.2.3-.5.3-.7.1-.3 0-.5 0-.7l-1.1-2.5c-.3-.7-.6-.7-1-.7h-.7Z" /></svg>
        </a>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 3h12a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7V10a7 7 0 0 1 7-7Zm0 2.7A4.3 4.3 0 0 0 5.7 10v12a4.3 4.3 0 0 0 4.3 4.3h12a4.3 4.3 0 0 0 4.3-4.3V10A4.3 4.3 0 0 0 22 5.7H10Zm13.9 2a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4ZM16 9.3a6.7 6.7 0 1 1 0 13.4 6.7 6.7 0 0 1 0-13.4Zm0 2.7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /></svg>
        </a>
        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer" aria-label="Google Empresas">
          <span className="visitor-google-icon">G</span>
        </a>
      </div>
    </header>
  );
}

function ProductGallery({ products, loading, error }: { products: Product[]; loading: boolean; error: string }) {
  if (loading) {
    return (
      <section className="visitor-section" aria-busy="true">
        <div className="visitor-section-heading">
          <span>PRODUTOS</span>
          <h1>Cuidados para levar pra casa</h1>
        </div>
        <div className="visitor-product-grid">
          {[1, 2, 3].map((item) => (
            <div className="visitor-product-card visitor-skeleton" key={item}>
              <div className="visitor-product-image" />
              <div className="visitor-skeleton-line" />
              <div className="visitor-skeleton-line short" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="visitor-section">
        <p className="visitor-error">{error}</p>
      </section>
    );
  }
  return (
    <section className="visitor-section">
      <div className="visitor-section-heading">
        <span>PRODUTOS</span>
        <h1>Cuidados para levar pra casa</h1>
        <p>Escolha um item e finalize o pedido diretamente pelo WhatsApp.</p>
      </div>
      {products.length ? (
        <div className="visitor-product-grid">
          {products.map((product) => {
            const image = storedImage(product.imageKey);
            const message = encodeURIComponent(
              `Olá! Tenho interesse no produto "${product.name}" (${money(product.price)}) que vi no site da Yuri Barbershop.`,
            );
            return (
              <article className="visitor-product-card" key={product.id}>
                <div className="visitor-product-image">
                  {image ? <img src={image} alt={product.name} loading="lazy" /> : <span aria-hidden="true">◇</span>}
                </div>
                <div className="visitor-product-body">
                  <small>{product.stock > 0 ? "Disponível" : "Consulte o estoque"}</small>
                  <h3>{product.name}</h3>
                  {product.description && <p>{product.description}</p>}
                  <div className="visitor-product-footer">
                    <strong>{money(product.price)}</strong>
                    <a href={`${WHATSAPP_BASE}?text=${message}`} target="_blank" rel="noreferrer">Pedir no WhatsApp</a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="visitor-empty">
          <p>Nenhum produto disponível no momento. Fale com a gente pelo WhatsApp.</p>
        </div>
      )}
    </section>
  );
}

function BookingFlow({
  services,
  collaborators,
  loading,
  error,
}: {
  services: Service[];
  collaborators: Collaborator[];
  loading: boolean;
  error: string;
}) {
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState<"schedule" | "notice" | "">("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState(0);
  const [bookingDate, setBookingDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", birthDate: "" });
  const [formError, setFormError] = useState("");
  const [acceptedRule, setAcceptedRule] = useState(false);
  const [greeting, setGreeting] = useState("Olá");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");
  }, []);

  const activeCollaborators = collaborators.filter((item) => item.active);
  const chosen = services.find((item) => item.name === selectedService);
  const total = chosen?.price || 0;
  const times = bookingTimesForDate(bookingDate);
  const selectedCollaborator = activeCollaborators.find((item) => item.id === selectedCollaboratorId);
  const formattedDate = bookingDate ? new Date(`${bookingDate}T12:00:00`).toLocaleDateString("pt-BR") : "";

  function restart() {
    setStep(-1);
    setMode("");
    setSelectedService("");
    setSelectedCollaboratorId(0);
    setBookingDate("");
    setSelectedTime("");
    setCustomer({ name: "", phone: "", birthDate: "" });
    setFormError("");
    setAcceptedRule(false);
  }

  function chooseDate() {
    if (!bookingDate) return;
    setSelectedTime("");
    setStep(mode === "schedule" ? 4 : 5);
  }

  function finishRegistration() {
    if (!customer.name.trim() || customer.phone.replace(/D/g, "").length < 10) {
      setFormError("Preencha seu nome e um telefone válido com DDD.");
      return;
    }
    setFormError("");
    setStep(6);
  }

  const requestKind = mode === "schedule" ? "solicitar um horário" : "avisar o dia em que pretendo ir";
  const confirmationText = encodeURIComponent(
    `Olá, Yuri! Gostaria de ${requestKind}.

Cliente: ${customer.name}
WhatsApp: ${customer.phone}
Serviço: ${selectedService}
Valor: ${money(total)}
Data: ${formattedDate}${mode === "schedule" ? `\nHorário desejado: ${selectedTime}` : "\nSem reserva de horário"}
Profissional: ${selectedCollaborator?.name || "Conforme disponibilidade"}`,
  );
  const confirmationUrl = `${WHATSAPP_BASE}?text=${confirmationText}`;

  if (loading) {
    return (
      <section className="visitor-section" aria-busy="true">
        <div className="visitor-chat visitor-skeleton-chat">
          <div className="visitor-skeleton-line" />
          <div className="visitor-skeleton-line short" />
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="visitor-section">
        <p className="visitor-error">{error}</p>
      </section>
    );
  }

  return (
    <section className="visitor-section">
      <div className="visitor-chat">
        <div className="visitor-chat-top">
          <img src="/brand/yuri-barbershop-logo.png" alt="" />
          <div>
            <strong>Assistente Yuri</strong>
            <small>atendimento online</small>
          </div>
        </div>
        <div className="visitor-chat-progress">
          <span style={{ width: step < 0 ? "0%" : `${Math.min(100, (Math.min(step, 6) + 1) * 16)}%` }} />
        </div>
        <div className="visitor-chat-body">
          {step === -1 && (
            <div className="visitor-chat-welcome">
              <img src="/brand/yuri-barbershop-logo.png" alt="Logo Yuri Barbershop" />
              <span>ATENDIMENTO ONLINE</span>
              <h1>Reserve sua experiência</h1>
              <p>Escolha o serviço, o profissional e o horário. Enviamos o pedido pelo WhatsApp para confirmação.</p>
              <button className="visitor-primary" onClick={() => setStep(0)}>Iniciar conversa</button>
            </div>
          )}

          {step >= 0 && <Bot>{greeting}! Posso te ajudar a marcar um horário?</Bot>}
          {step === 0 && (
            <Options>
              <Choice icon="✓" title="Sim, quero agendar" onClick={() => setStep(1)} />
              <Choice icon="◉" title="Falar direto no WhatsApp" href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Olá! Gostaria de tirar uma dúvida.")}`} />
            </Options>
          )}

          {step >= 1 && selectedService && <User>{selectedService} — {money(total)}</User>}
          {step === 1 && (
            <>
              <Bot>Qual serviço você gostaria de fazer?</Bot>
              <Options>
                {services.map((service) => (
                  <Choice
                    key={service.id}
                    icon="✂"
                    title={service.name}
                    subtitle={`${service.time} • ${money(service.price)}`}
                    onClick={() => {
                      setSelectedService(service.name);
                      if (activeCollaborators.length > 1) setStep(15);
                      else {
                        if (activeCollaborators.length === 1) setSelectedCollaboratorId(activeCollaborators[0].id);
                        setStep(2);
                      }
                    }}
                  />
                ))}
              </Options>
            </>
          )}

          {step === 15 && (
            <>
              <Bot>Você prefere ser atendido por qual profissional?</Bot>
              <Options>
                <Choice icon="✂" title="Qualquer profissional" onClick={() => { setSelectedCollaboratorId(0); setStep(2); }} />
                {activeCollaborators.map((item) => (
                  <Choice key={item.id} icon="♙" title={item.name} onClick={() => { setSelectedCollaboratorId(item.id); setStep(2); }} />
                ))}
              </Options>
            </>
          )}

          {step >= 2 && selectedCollaborator && <User>Profissional: {selectedCollaborator.name}</User>}
          {step === 2 && (
            <>
              <Bot>Como você prefere continuar?</Bot>
              <Options>
                <Choice icon="◷" title="Escolher data e horário" subtitle="Pedido sujeito à confirmação no WhatsApp" onClick={() => { setMode("schedule"); setStep(3); }} />
                <Choice icon="→" title="Apenas avisar o dia" subtitle="Sem reserva de horário" onClick={() => { setMode("notice"); setStep(3); }} />
              </Options>
            </>
          )}

          {step >= 3 && bookingDate && <User>{new Date(`${bookingDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</User>}
          {step === 3 && (
            <>
              <Bot>Qual dia você pretende vir?</Bot>
              <div className="visitor-date-picker">
                <input type="date" min={new Date().toISOString().slice(0, 10)} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
                <button className="visitor-primary" disabled={!bookingDate} onClick={chooseDate}>Continuar</button>
              </div>
            </>
          )}

          {step >= 4 && mode === "schedule" && selectedTime && <User>{selectedTime}</User>}
          {step === 4 && mode === "schedule" && (
            <>
              <Bot>Qual horário você gostaria?</Bot>
              <div className="visitor-time-grid">
                {times.map((time) => (
                  <button key={time} onClick={() => { setSelectedTime(time); setStep(5); }}>{time}</button>
                ))}
              </div>
              {!times.length && <p className="visitor-form-error">A barbearia não atende nesta data. Escolha outro dia.</p>}
            </>
          )}

          {step >= 5 && customer.name && <User>Cadastro preenchido.</User>}
          {step === 5 && (
            <>
              <Bot>Para finalizar, preciso confirmar seus dados.</Bot>
              <div className="visitor-form">
                <label>
                  Nome completo
                  <input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Digite seu nome" />
                </label>
                <label>
                  WhatsApp
                  <input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="(62) 99999-9999" inputMode="tel" />
                </label>
                {formError && <p className="visitor-form-error">{formError}</p>}
                <button className="visitor-primary" onClick={finishRegistration}>Continuar</button>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <Bot>Perfeito, {customer.name.split(" ")[0]}! Confira antes de abrir o WhatsApp:</Bot>
              <div className="visitor-summary">
                <span>Serviço<strong>{selectedService}</strong></span>
                <span>Data<strong>{formattedDate}</strong></span>
                {mode === "schedule" && <span>Horário desejado<strong>{selectedTime}</strong></span>}
                {mode === "notice" && <span>Forma de atendimento<strong>Somente aviso do dia</strong></span>}
                <span className="visitor-summary-total">Valor<strong>{money(total)}</strong></span>
                <label className="visitor-check">
                  <input type="checkbox" checked={acceptedRule} onChange={(event) => setAcceptedRule(event.target.checked)} />
                  Conferi os dados e quero continuar.
                </label>
                {acceptedRule ? (
                  <a className="visitor-primary" href={confirmationUrl} target="_blank" rel="noreferrer" onClick={() => setStep(7)}>Confirmar e abrir WhatsApp</a>
                ) : (
                  <button className="visitor-primary" disabled>Confirmar e abrir WhatsApp</button>
                )}
              </div>
            </>
          )}

          {step === 7 && (
            <div className="visitor-success">
              <b>✓</b>
              <h3>Mensagem preparada!</h3>
              <p>Continue no WhatsApp para enviar o pedido ao Yuri.</p>
              <a href={confirmationUrl} target="_blank" rel="noreferrer">Abrir WhatsApp novamente</a>
              <button className="visitor-link-button" onClick={restart}>Iniciar outro atendimento</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Bot({ children }: any) {
  return (
    <div className="visitor-bubble-row">
      <div className="visitor-tiny-bot">Y</div>
      <div className="visitor-bubble visitor-bot-bubble">{children}</div>
    </div>
  );
}
function User({ children }: any) {
  return <div className="visitor-bubble visitor-user-bubble">{children}</div>;
}
function Options({ children }: any) {
  return <div className="visitor-options">{children}</div>;
}
function Choice({ icon, title, subtitle, onClick, href }: any) {
  const content = (
    <>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <b>›</b>
    </>
  );
  if (href) {
    return <a className="visitor-choice" href={href} target="_blank" rel="noreferrer">{content}</a>;
  }
  return <button className="visitor-choice" onClick={onClick}>{content}</button>;
}
