"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Brand from "./brand";
import { Button } from "./ui/button";

type Role = "admin" | "client" | "barber";
type Props = {
  user: { name: string; email: string };
  role: Role;
  demo?: boolean;
  initialSection?: string;
};

const visitorPromotions = [
  { id: "visitor-promo-1", title: "Primeira visita com um cuidado especial", description: "Converse com o Yuri pelo WhatsApp e conheça as condições disponíveis para novos clientes.", validUntil: null },
  { id: "visitor-promo-2", title: "Clube Yuri: visual em dia o mês inteiro", description: "Plano individual com serviços ilimitados durante 30 dias, mediante agendamento e confirmação do pagamento.", validUntil: null },
];

const visitorCatalog = [
  { id: "visitor-style-1", name: "Degradê clássico", category: "corte", description: "Laterais graduadas e acabamento limpo para o dia a dia." },
  { id: "visitor-style-2", name: "Corte social", category: "corte", description: "Visual tradicional, elegante e fácil de manter." },
  { id: "visitor-style-3", name: "Barba desenhada", category: "barba", description: "Contorno definido e acabamento alinhado ao formato do rosto." },
  { id: "visitor-style-4", name: "Barba completa", category: "barba", description: "Aparagem, alinhamento e acabamento para valorizar o visual." },
  { id: "visitor-style-5", name: "Pigmentação", category: "quimica", description: "Realce temporário para cabelo ou barba, após avaliação profissional." },
  { id: "visitor-style-6", name: "Luzes e nevou", category: "quimica", description: "Clareamento planejado de acordo com o cabelo." },
];

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

const icons: Record<string, string> = {
  inicio: "⌂",
  agenda: "□",
  caixa: "◫",
  clientes: "♙",
  servicos: "✂",
  produtos: "◇",
  relatorios: "↗",
  remarketing: "↻",
  promocoes: "★",
  localizacao: "⌖",
  catalogo: "▦",
  assinatura: "♛",
  mensagens: "✉",
  crescimento: "↗",
  colaboradores: "♙",
  ganhos: "$",
  historico: "◷",
  fidelidade: "★",
  avaliar: "☆",
  perfil: "◉",
};

export default function PortalClient({ user, role, demo = false, initialSection }: Props) {
  const [portalRole, setPortalRole] = useState<Role>(role);
  const [section, setSection] = useState(
    initialSection || (role === "admin" || role === "barber" ? "inicio" : "agendar"),
  );
  const [selectedService, setSelectedService] = useState("Corte");
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [notice, setNotice] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [liveServices, setLiveServices] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [clientLoyalty, setClientLoyalty] = useState<any>(null);
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [livePromotions, setLivePromotions] = useState<any[]>(demo ? visitorPromotions : []);
  const [liveCatalog, setLiveCatalog] = useState<any[]>(demo ? visitorCatalog : []);
  const [liveSubscriptions, setLiveSubscriptions] = useState<any[]>([]);
  const [subscriptionCampaigns, setSubscriptionCampaigns] = useState<any[]>([]);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any>({ reviews: [], waitlist: [], scheduleBlocks: [], settings: {} });
  const [adminData, setAdminData] = useState<any>({ clientSummaries: [], appointments: [] });
  const [liveCollaborators, setLiveCollaborators] = useState<any[]>([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedChartDayKey, setSelectedChartDayKey] = useState("");
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(new Date()),
    [],
  );
  const adminItems = [
    ["inicio", "Início", "VISÃO GERAL"],
    ["mensagens", "Caixa de entrada", "VISÃO GERAL"],
    ["agenda", "Agenda", "OPERAÇÃO"],
    ["caixa", "Caixa", "OPERAÇÃO"],
    ["clientes", "Clientes", "GESTÃO"],
    ["colaboradores", "Colaboradores", "GESTÃO"],
    ["remarketing", "Remarketing", "CRESCIMENTO"],
    ["servicos", "Serviços", "CATÁLOGO"],
    ["produtos", "Produtos", "CATÁLOGO"],
    ["relatorios", "Relatórios", "FINANCEIRO"],
  ];
  const barberItems = [
    ["inicio", "Meu painel", "VISÃO GERAL"],
    ["mensagens", "Caixa de entrada", "VISÃO GERAL"],
    ["agenda", "Minha agenda", "AGENDA"],
    ["ganhos", "Meus ganhos", "FINANCEIRO"],
    ["perfil", "Meu perfil", "CONTA"],
  ];
  const registeredClientItems = [
    ["agendar", "Agendar", "ATENDIMENTO"],
    ["produtos", "Produtos", "CONHEÇA"],
    ["fidelidade", "Fidelidade", "BENEFÍCIOS"],
  ];
  const visitorItems = [
    ["agendar", "Agendar", "ATENDIMENTO"],
    ["produtos", "Produtos", "CONHEÇA"],
  ];
  const clientItems = demo ? visitorItems : registeredClientItems;
  const items = portalRole === "admin" ? adminItems : portalRole === "barber" ? barberItems : clientItems;
  const unreadMessages = liveMessages.filter((message:any) => !message.read).length;

  function switchPortal(nextRole: Role) {
    setPortalRole(nextRole);
    setSection(nextRole === "admin" || nextRole === "barber" ? "inicio" : "agendar");
    setMenuOpen(false);
    setNotice("");
  }

  function navigate(key: string) {
    setSection(key);
    setMenuOpen(false);
    setNotice("");
  }
  async function loadData() {
    setProductsLoading(true);
    setProductsError("");
    return fetch("/api/data")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setLiveServices(
          (data.services || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.priceCents / 100,
            time: `${s.durationMin} min`,
          })),
        );
        setLiveProducts(
          (data.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.priceCents / 100,
            description: p.description,
            imageKey: p.imageKey,
            stock: p.stock,
            featured: p.featured,
            showOnLogin: p.showOnLogin,
          })),
        );
        setLiveCollaborators(data.collaborators || []);
        setProductsLoading(false);
        if (!demo) {
          if (data.profiles?.[0]) setClientProfile(data.profiles[0]);
          setClientLoyalty(data.clientLoyalty || null);
          setClientAppointments(data.appointments || []);
          setLivePromotions(data.promotions || []);
          setLiveCatalog(data.catalogItems || []);
          setLiveSubscriptions(data.subscriptions || []);
          setSubscriptionCampaigns(data.subscriptionCampaigns || []);
          setLiveMessages(data.messages || []);
          setGrowthData({ reviews: data.reviews || [], waitlist: data.waitlist || [], scheduleBlocks: data.scheduleBlocks || [], settings: data.settings || {} });
          if (data.isAdmin || data.isBarber) setAdminData({ ...data, clientSummaries: data.clientSummaries || [], appointments: data.appointments || [], transactions: data.transactions || [], services: data.services || [], products: data.products || [], promotions: data.promotions || [], catalogItems: data.catalogItems || [], subscriptions: data.subscriptions || [], subscriptionCampaigns: data.subscriptionCampaigns || [], messages: data.messages || [], reviews: data.reviews || [], waitlist: data.waitlist || [], scheduleBlocks: data.scheduleBlocks || [], marketingContacts: data.marketingContacts || [], settings: data.settings || {} });
        }
      })
      .catch(() => {
        setProductsLoading(false);
        setProductsError("Não foi possível carregar o catálogo agora. Tente novamente.");
        if (!demo) setNotice("Não foi possível carregar os dados agora.");
      });
  }
  useEffect(() => {
    loadData();
  }, [demo]);
  async function confirmBooking(productId?: number, customer?: { name: string; phone: string; birthDate: string }) {
    if (demo) {
      setNotice(`Agendamento solicitado: ${selectedService}, às ${selectedTime}.`);
      return true;
    }
    const service = liveServices.find((s) => s.name === selectedService);
    if (customer) {
      const profileResponse = await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "profile", ...customer }) });
      if (!profileResponse.ok) { setNotice("Não foi possível salvar seu cadastro."); return false; }
    }
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "appointment",
        serviceId: service?.id,
        productId,
        date: bookingDate,
        time: selectedTime,
        collaboratorId: selectedCollaboratorId || undefined,
      }),
    });
    const data = await response.json();
    setNotice(
      response.ok
        ? `Agendamento solicitado: ${selectedService}, às ${selectedTime}.`
        : data.error || "Não foi possível agendar.",
    );
    return response.ok;
  }

  return (
    <main className={`app-shell ${portalRole === "client" ? "client-public-shell" : ""}`}>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Brand onClick={() => demo ? window.location.assign("/") : navigate(portalRole === "client" ? "agendar" : "inicio")} />
        <nav aria-label="Navegação principal">
          {items.map(([key, label, group], index) => (
            <Fragment key={key}>
              {group && (index === 0 || items[index - 1]?.[2] !== group) && <small className="menu-group-label">{group}</small>}
              <button
                className={section === key ? "active" : ""}
                onClick={() => navigate(key)}
                aria-current={section === key ? "page" : undefined}
              >
                <span>{icons[key] || "•"}</span>
                {label}
                {key === "mensagens" && unreadMessages > 0 && <b className="inbox-badge">{unreadMessages}</b>}
              </button>
            </Fragment>
          ))}
        </nav>
        {portalRole === "client" && <div className="sidebar-social">
          <small>FALE COM A GENTE</small>
          <a className="menu-whatsapp" href="https://wa.me/5562981007636?text=Ol%C3%A1%2C%20vim%20pelo%20aplicativo%20da%20Yuri%20Barbershop." target="_blank" rel="noreferrer" onClick={()=>setMenuOpen(false)}>
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a12.7 12.7 0 0 0-11 19l-1.5 6 6.1-1.5A12.8 12.8 0 1 0 16 3Zm0 2.6a10.2 10.2 0 0 1 0 20.4c-1.8 0-3.5-.5-5-1.3l-.6-.3-3.6.9.9-3.5-.4-.6A10.2 10.2 0 0 1 16 5.6Zm-4.8 4.8c-.3 0-.6.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.2.2 2.1 3.4 5.2 4.6 2.5 1 3.1.8 3.7.7.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.4-.3-.8-.5l-2.4-1.1c-.4-.2-.7-.3-1 .3l-1 1.2c-.2.3-.5.3-.9.1-1.2-.6-2.3-1.3-3.1-2.4-.2-.4 0-.6.2-.8l.7-.8c.2-.2.3-.5.4-.7.1-.3 0-.5 0-.7l-1.1-2.5c-.3-.7-.6-.7-1-.7h-.7Z"/></svg>
            <span>WhatsApp</span>
          </a>
          <a className="menu-instagram" href="https://www.instagram.com/yuricbarbearia" target="_blank" rel="noreferrer" onClick={()=>setMenuOpen(false)}>
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 3h12a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7V10a7 7 0 0 1 7-7Zm0 2.7A4.3 4.3 0 0 0 5.7 10v12a4.3 4.3 0 0 0 4.3 4.3h12a4.3 4.3 0 0 0 4.3-4.3V10A4.3 4.3 0 0 0 22 5.7H10Zm13.9 2a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4ZM16 9.3a6.7 6.7 0 1 1 0 13.4 6.7 6.7 0 0 1 0-13.4Zm0 2.7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>
            <span>Instagram</span>
          </a>
          <a className="menu-google" href="https://g.page/r/CaO2Z7is9bPgEAE/review" target="_blank" rel="noreferrer" onClick={()=>setMenuOpen(false)}>
            <span className="google-business-icon">G</span>
            <span>Google Empresas</span>
          </a>
        </div>}
        <div className="sidebar-user">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{portalRole === "admin" ? "Yuri César" : demo ? "Visitante" : user.name}</strong>
            <small>{portalRole === "admin" ? "Administrador" : portalRole === "barber" ? "Barbeiro colaborador" : role === "admin" ? "Visualização do cliente" : demo ? "Acesso público" : "Cliente"}</small>
            {!demo && <span className="user-email">{user.email}</span>}
          </div>
        </div>
        {role === "admin" && (
          <button
            type="button"
            className="logout-button portal-switch-button"
            onClick={() => switchPortal(portalRole === "admin" ? "client" : "admin")}
          >
            <span>⇄</span> {portalRole === "admin" ? "Ir para agendamento" : "Voltar ao painel administrativo"}
          </button>
        )}
        <a
          className="logout-button"
          href="/api/auth/logout"
          rel="nofollow"
        >
          <span>↪</span> {demo ? "Voltar ao login" : portalRole === "admin" ? "Sair / trocar usuário" : "Sair"}
        </a>
      </aside>
      <section className="app-content">
        <header className="app-header">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-controls="mobile-primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu principal" : "Abrir menu principal"}
          >
            ☰
          </button>
          <div>
            <small>{today}</small>
            <h1>{sectionTitle(portalRole, section)}</h1>
          </div>
          <div className="header-actions">
            {demo && <span className="demo-badge">Modo visitante</span>}
            {!demo && <button className={`icon-button notification-button ${unreadMessages ? "has-notification" : ""}`} onClick={() => navigate("mensagens")} aria-label="Abrir caixa de entrada">✉{unreadMessages > 0 && <b>{unreadMessages}</b>}</button>}
          </div>
        </header>
        {portalRole === "admin" ? (
          <AdminView section={section} onNavigate={navigate} data={adminData} user={user} onRefresh={loadData} />
        ) : portalRole === "barber" ? (
          <BarberView section={section} data={adminData} user={user} onRefresh={loadData} />
        ) : (
          <ClientView
            section={section}
            onNavigate={navigate}
            user={user}
            demo={demo}
            services={liveServices}
            products={liveProducts}
            profile={clientProfile}
            loyalty={clientLoyalty}
            appointments={clientAppointments}
            promotions={livePromotions}
            catalogItems={liveCatalog}
            subscriptions={liveSubscriptions}
            subscriptionCampaigns={subscriptionCampaigns}
            messages={liveMessages}
            growth={growthData}
            onRefresh={loadData}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            bookingDate={bookingDate}
            setBookingDate={setBookingDate}
            notice={notice}
            setNotice={setNotice}
            confirmBooking={confirmBooking}
            collaborators={liveCollaborators}
            selectedCollaboratorId={selectedCollaboratorId}
            setSelectedCollaboratorId={setSelectedCollaboratorId}
          />
        )}
      </section>
    </main>
  );
}

function sectionTitle(role: Role, section: string) {
  const titles: Record<string,string> = { inicio: role === "barber" ? "Meu painel" : "Visão geral", mensagens: "Caixa de entrada", agenda: role === "barber" ? "Minha agenda" : "Agenda", caixa: "Livro caixa", clientes: "Clientes", colaboradores: "Colaboradores", remarketing: "Remarketing", servicos: "Serviços", produtos: "Produtos", catalogo: "Catálogo de estilos", promocoes: "Promoções", assinatura: "Assinaturas", relatorios: "Relatórios", crescimento: "Crescimento", ganhos: "Meus ganhos", perfil: "Meu perfil", agendar: "Agendamento", "meus-horarios": "Meus horários", historico: "Meu histórico", fidelidade: "Fidelidade", avaliar: "Avaliação", localizacao: "Localização" };
  return titles[section] || (role === "client" ? "Área do cliente" : "Painel");
}

function BarberView({ section, data, user, onRefresh }: any) {
  const rows = data.appointments || [];
  const finalized = rows.filter((item:any) => item.status === "Finalizado");
  const total = finalized.reduce((sum:number,item:any)=>sum+(item.commissionCents||0),0);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  if (section === "mensagens") return <Inbox messages={data.messages || []} clients={[]} user={user} onRefresh={onRefresh} />;
  if (section === "agenda") return <Agenda appointments={rows} collaborators={data.collaborators || []} onRefresh={onRefresh} barberMode />;
  if (section === "ganhos") return <section><div className="section-title"><div><small>TRANSPARÊNCIA</small><h2>Meus ganhos</h2></div></div><div className="metric-grid"><Metric label="Comissão acumulada" value={money(total)} hint="Atendimentos finalizados" tone="gold"/><Metric label="Atendimentos finalizados" value={String(finalized.length)} hint="Histórico registrado"/><Metric label="Percentual padrão" value={`${data.currentCollaborator?.defaultCommissionPercent ?? 0}%`} hint="Pode variar por serviço"/></div><Registry title="Comissões por atendimento" headers={["Data","Cliente","Serviço","Percentual","Comissão"]} rows={finalized.map((item:any)=>[formatDate(item.date),item.clientName,item.serviceName,`${item.commissionPercent}%`,money(item.commissionCents)])} showAdd={false}/></section>;
  if (section === "perfil") return <section className="form-panel"><small>MEU CADASTRO</small><h2>{data.currentCollaborator?.name || user.name}</h2><p>{user.email}</p><p>Comissão padrão atual: <b>{data.currentCollaborator?.defaultCommissionPercent ?? 0}%</b>. Ajustes são feitos pelo administrador.</p></section>;
  const todayRows = rows.filter((item:any)=>item.date===today && item.status!=="Cancelado");
  return <section className="dashboard"><div className="welcome-line"><div><p>Olá, {user.name.split(" ")[0]}!</p><h2>Seu resumo de hoje</h2></div></div><div className="metric-grid"><Metric label="Atendimentos hoje" value={String(todayRows.length)} hint={`${todayRows.filter((item:any)=>item.status==="Pendente").length} pendentes`} tone="gold"/><Metric label="Comissão acumulada" value={money(total)} hint="Atendimentos finalizados"/><Metric label="Próximo cliente" value={todayRows[0]?.time || "—"} hint={todayRows[0]?.clientName || "Agenda livre"}/></div><Agenda appointments={todayRows} collaborators={data.collaborators || []} onRefresh={onRefresh} barberMode /></section>;
}

type DashboardChartDay = {
  key: string;
  revenue: number;
  label: string;
  fullLabel: string;
};

type AdminDashboardData = {
  transactions?: Array<{ id?: number | string; date: string; kind?: string; amountCents?: number; description?: string }>;
  appointments?: Array<{ id?: number | string; date: string; time: string; status?: string; clientName?: string; serviceName?: string; totalCents?: number }>;
  [key: string]: any;
};

function AdminView({
  section,
  onNavigate,
  data,
  user,
  onRefresh,
}: {
  section: string;
  onNavigate: (s: string) => void;
  data: AdminDashboardData;
  user: { name: string; email: string };
  onRefresh: () => Promise<any> | undefined;
}) {
  const [selectedChartDayKey, setSelectedChartDayKey] = useState("");
  const [chartHoveredDayKey, setChartHoveredDayKey] = useState("");
  const isoToday = localDateKey();
  const month = isoToday.slice(0,7);
  const todayTransactions = (data.transactions||[]).filter((t:any)=>t.date===isoToday);
  const monthTransactions = (data.transactions||[]).filter((t:any)=>t.date?.startsWith(month));
  const todayRevenue = todayTransactions.filter((t:any)=>t.kind?.toLowerCase()==="entrada").reduce((s:number,t:any)=>s+t.amountCents,0);
  const monthBalance = monthTransactions.reduce((s:number,t:any)=>s+(t.kind?.toLowerCase()==="entrada"?t.amountCents:-t.amountCents),0);
  const todayAppointments = (data.appointments||[]).filter((a:any)=>a.date===isoToday && a.status!=="Cancelado");
  const ticket = todayAppointments.length ? todayAppointments.reduce((s:number,a:any)=>s+a.totalCents,0)/todayAppointments.length : 0;
  const upcomingAppointments = (data.appointments || [])
    .filter((item: any) => item.date >= isoToday && item.status !== "Cancelado")
    .sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 3);
  const todayAtNoon = new Date(`${isoToday}T12:00:00`);
  const lastSevenDays: DashboardChartDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayAtNoon);
    date.setDate(date.getDate() - (6 - index));
    const key = localDateKey(date);
    const revenue = (data.transactions || [])
      .filter((item: any) => item.date === key && item.kind?.toLowerCase() === "entrada")
      .reduce((sum: number, item: any) => sum + Number(item.amountCents || 0), 0);
    return {
      key,
      revenue,
      label: date.toLocaleDateString("pt-BR", { weekday: "narrow" }).slice(0, 1).toUpperCase(),
      fullLabel: date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }),
    };
  });
  const sevenDayRevenue = lastSevenDays.reduce((sum, day) => sum + day.revenue, 0);
  const highestDailyRevenue = Math.max(...lastSevenDays.map((day) => day.revenue), 0);
  const selectedChartDay =
    lastSevenDays.find((day) => day.key === selectedChartDayKey) ||
    lastSevenDays[lastSevenDays.length - 1];
  if (section === "mensagens") return <Inbox messages={data.messages || []} clients={data.clientSummaries || []} user={user} isAdmin onRefresh={onRefresh} />;
  if (section === "crescimento") return <GrowthCenter data={data} onRefresh={onRefresh} />;
  if (section === "agenda") return <Agenda appointments={data.appointments || []} collaborators={data.collaborators || []} onRefresh={onRefresh} />;
  if (section === "caixa") return <Cash transactions={data.transactions || []} services={data.services || []} clients={data.clientSummaries || []} onRefresh={onRefresh} />;
  if (section === "clientes")
    return <ClientsDatabase clients={data.clientSummaries || []} onRefresh={onRefresh} />;
  if (section === "colaboradores") return <CollaboratorManager collaborators={data.collaborators || []} services={data.services || []} links={data.collaboratorServices || []} appointments={data.appointments || []} settlements={data.commissionSettlements || []} onRefresh={onRefresh} />;
  if (section === "remarketing") return <Remarketing clients={data.clientSummaries || []} initialContacts={data.marketingContacts || []} onRefresh={onRefresh} />;
  if (section === "servicos") return <ServiceManager items={data.services || []} onRefresh={onRefresh}/>;
  if (section === "produtos") return <><ProductCampaignManager items={data.products || []} onRefresh={onRefresh}/><CatalogManager type="product" items={data.products || []} onRefresh={onRefresh}/></>;
  if (section === "catalogo") return <StyleCatalogManager items={data.catalogItems || []} onRefresh={onRefresh}/>;
  if (section === "assinatura") return <><CampaignManager campaigns={data.subscriptionCampaigns || []} onRefresh={onRefresh}/><SubscriptionAdmin items={data.subscriptions || []} onRefresh={onRefresh}/></>;
  if (section === "promocoes") return <PromotionManager items={data.promotions || []} onRefresh={onRefresh}/>;
  if (section === "relatorios") return <Reports transactions={data.transactions || []} appointments={data.appointments || []} clients={data.clientSummaries || []} services={data.services || []} onRefresh={onRefresh} />;
  return (
    <div className="dashboard">
      <div className="welcome-line">
        <div>
          <p>Bom trabalho, Yuri!</p>
          <h2>Resumo de hoje</h2>
        </div>
        <div className="welcome-actions">
          <Button type="button" variant="primary" className="dashboard-primary-action" onClick={() => onNavigate("agenda")}>
            + Novo agendamento
          </Button>
          <Button type="button" variant="secondary" className="dashboard-secondary-action" onClick={() => onNavigate("caixa")}>
            + Nova movimentação
          </Button>
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          label="Faturamento hoje"
          value={money(todayRevenue)}
          hint="Entradas registradas no caixa"
          tone="gold"
        />
        <Metric label="Atendimentos" value={String(todayAppointments.length)} hint={`${todayAppointments.filter((a:any)=>a.status==="Pendente").length} pendentes`} />
        <Metric label="Ticket médio" value={money(Math.round(ticket))} hint="Média dos atendimentos de hoje" />
        <Metric
          label="Saldo do mês"
          value={money(monthBalance)}
          hint="Entradas - saídas"
        />
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <small>AGENDA</small>
              <h3>Próximos atendimentos</h3>
            </div>
            <button type="button" className="panel-link-button" onClick={() => onNavigate("agenda")}>Ver agenda</button>
          </div>
          {upcomingAppointments.length ? upcomingAppointments.map((item: any) => (
            <Appointment
              key={item.id || `${item.date}-${item.time}-${item.clientName}`}
              time={item.time}
              client={item.clientName}
              service={`${item.serviceName} · ${formatDate(item.date)}`}
              status={item.status}
            />
          )) : <p className="form-hint">Nenhum atendimento futuro registrado.</p>}
        </section>
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <small>FATURAMENTO</small>
              <h3>Últimos 7 dias</h3>
            </div>
            <b>{money(sevenDayRevenue)}</b>
          </div>
          <p className="chart-hint">Passe o mouse ou toque em um dia para ver o valor. Clique para detalhar.</p>
          <div className="bars" role="group" aria-label="Faturamento dos últimos 7 dias">
            {lastSevenDays.map((day) => (
              <button
                type="button"
                key={day.key}
                className={`bar-item ${selectedChartDayKey === day.key ? "selected" : ""} ${chartHoveredDayKey === day.key ? "hovered" : ""}`}
                title={`${day.fullLabel}: ${money(day.revenue)}`}
                aria-label={`${day.fullLabel}: ${money(day.revenue)}`}
                aria-pressed={selectedChartDayKey === day.key}
                onMouseEnter={() => setChartHoveredDayKey(day.key)}
                onMouseLeave={() => setChartHoveredDayKey("")}
                onFocus={() => setChartHoveredDayKey(day.key)}
                onBlur={() => setChartHoveredDayKey("")}
                onClick={() => setSelectedChartDayKey(day.key)}
              >
                <span aria-hidden="true" style={{ height: `${highestDailyRevenue ? Math.max(2, (day.revenue / highestDailyRevenue) * 100) : 2}%` }} />
                <small>{day.label}</small>
                <span className="bar-tooltip" role="tooltip">{day.fullLabel} · {money(day.revenue)}</span>
              </button>
            ))}
          </div>
          {(() => {
            const selected = lastSevenDays.find((day) => day.key === selectedChartDayKey);
            if (!selected) return null;
            const dayAppointments = (data.appointments || []).filter((item) => item.date === selected.key && item.status !== "Cancelado");
            const dayTransactions = (data.transactions || []).filter((item) => item.date === selected.key);
            return (
              <div className="chart-detail" role="status" aria-live="polite">
                <div>
                  <small>DETALHE SELECIONADO</small>
                  <strong>{selected.fullLabel}</strong>
                  <span>{dayAppointments.length} atendimento{dayAppointments.length === 1 ? "" : "s"} · {dayTransactions.length} lançamento{dayTransactions.length === 1 ? "" : "s"}</span>
                </div>
                <b>{money(selected.revenue)}</b>
              </div>
            );
          })()}
        </section>
      </div>
      <div className="quick-actions" aria-label="Ações rápidas">
        <Button type="button" variant="tertiary" className="quick-action" onClick={() => onNavigate("caixa")}>＋ Registrar despesa</Button>
        <Button type="button" variant="tertiary" className="quick-action" onClick={() => onNavigate("clientes")}>♙ Cadastrar cliente</Button>
        <Button type="button" variant="tertiary" className="quick-action" onClick={() => onNavigate("produtos")}>◇ Atualizar estoque</Button>
      </div>
    </div>
  );
}

function ClientView({
  section,
  onNavigate,
  user,
  demo,
  services,
  products,
  profile,
  loyalty,
  appointments,
  promotions,
  catalogItems,
  subscriptions,
  subscriptionCampaigns,
  messages,
  growth,
  onRefresh,
  selectedService,
  setSelectedService,
  selectedTime,
  setSelectedTime,
  bookingDate,
  setBookingDate,
  notice,
  setNotice,
  confirmBooking,
  collaborators,
  selectedCollaboratorId,
  setSelectedCollaboratorId,
}: any) {
  if (section === "mensagens") return <Inbox messages={messages || []} clients={[]} user={user} onRefresh={onRefresh} />;
  if (section === "historico") return <ClientHistory appointments={appointments || []} />;
  if (section === "fidelidade") return <LoyaltyCard snapshot={loyalty} user={user} />;
  if (section === "avaliar") return <ReviewAndWaitlist onRefresh={onRefresh} />;
  if (section === "meus-horarios")
    return (
      <Registry
        title="Meus horários"
        headers={["Data", "Horário", "Serviço", "Status", "Mensagem da barbearia"]}
        rows={(appointments || []).map((a: any) => [formatDate(a.date), a.time, a.serviceName, a.status, a.adminMessage || "—"])}
        showAdd={false}
      />
    );
  if (section === "produtos")
    return <><ProductAds items={(products || []).filter((p:any)=>p.featured)}/><ProductGallery items={products || []} loading={productsLoading} error={productsError} onRetry={onRefresh} /></>;
  if (section === "perfil")
    return <ClientProfile user={user} profile={profile} demo={demo} onRefresh={onRefresh} />;
  if (section === "promocoes") return <Promotions items={promotions || []} subscriptions={subscriptions || []} demo={demo} />;
  if (section === "localizacao") return <Location />;
  if (section === "catalogo") return <StyleCatalog items={catalogItems || []} />;
  if (section === "assinatura") return <><SubscriptionCreative campaigns={subscriptionCampaigns || []}/><SubscriptionClient items={subscriptions || []} demo={demo} onRefresh={onRefresh} /></>;
  return (
    <BookingChat
      {...{
        user,
        demo,
        services,
        products,
        profile,
        selectedService,
        setSelectedService,
        selectedTime,
        setSelectedTime,
        bookingDate,
        setBookingDate,
        notice,
        setNotice,
        confirmBooking,
        promotions,
        subscriptionCampaigns,
        onNavigate,
        collaborators,
        selectedCollaboratorId,
        setSelectedCollaboratorId,
      }}
    />
  );
}

function Inbox({ messages, clients, user, isAdmin = false, onRefresh }: any) {
  const [selected, setSelected] = useState<any>(messages[0] || null);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState({ recipientEmail: "", subject: "", body: "" });
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (!selected && messages.length) setSelected(messages[0]);
  }, [messages, selected]);
  async function openMessage(message:any) {
    setSelected(message);
    if (!message.read) {
      await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "message-read", id: message.id }) });
      await onRefresh?.();
    }
  }
  async function sendMessage() {
    if ((isAdmin && !form.recipientEmail) || !form.body.trim()) { setStatus("Escolha o destinatário e escreva a mensagem."); return; }
    const response = await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "message-send", ...form }) });
    if (!response.ok) { setStatus("Não foi possível enviar a mensagem."); return; }
    setStatus("Mensagem enviada com sucesso.");
    setForm({ recipientEmail: "", subject: "", body: "" });
    setCompose(false);
    await onRefresh?.();
  }
  return <section className="inbox-page">
    <div className="section-title"><div><small>COMUNICAÇÃO INTERNA</small><h2>Caixa de entrada</h2></div><button className="primary-button small" onClick={()=>setCompose(!compose)}>+ Nova mensagem</button></div>
    {compose && <div className="compose-message">
      <h3>Nova mensagem</h3>
      {isAdmin && <label>Enviar para<select value={form.recipientEmail} onChange={e=>setForm({...form,recipientEmail:e.target.value})}><option value="">Selecione o cliente</option>{clients.map((client:any)=><option key={client.email} value={client.email}>{client.name} — {client.email}</option>)}</select></label>}
      {!isAdmin && <label>Enviar para<input value="Yuri Barbershop — Administrador" disabled /></label>}
      <label>Assunto<input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Assunto da mensagem" /></label>
      <label>Mensagem<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Escreva sua mensagem..." rows={5}/></label>
      <button className="primary-button small" onClick={sendMessage}>Enviar mensagem</button>
    </div>}
    {status && <p className="form-message">{status}</p>}
    <div className="inbox-layout">
      <div className="message-list">
        <div className="message-list-head"><strong>Recebidas</strong><span>{messages.filter((m:any)=>!m.read).length} não lidas</span></div>
        {messages.length ? messages.map((message:any)=><button key={message.id} className={`${!message.read?"unread":""} ${selected?.id===message.id?"selected":""}`} onClick={()=>openMessage(message)}><span className="message-avatar">{message.senderName?.[0] || "Y"}</span><span><strong>{message.senderName}</strong><b>{message.subject}</b><small>{new Date(message.createdAt).toLocaleString("pt-BR")}</small></span>{!message.read&&<i/>}</button>) : <div className="empty-inbox"><b>✉</b><h3>Nenhuma mensagem</h3><p>Suas mensagens internas aparecerão aqui.</p></div>}
      </div>
      <article className="message-reader">{selected ? <><header><span className="message-avatar">{selected.senderName?.[0] || "Y"}</span><div><h3>{selected.subject}</h3><p>De: {selected.senderName}</p><small>{new Date(selected.createdAt).toLocaleString("pt-BR")}</small></div></header><div className="message-content">{selected.body}</div>{!isAdmin&&<button className="primary-button small" onClick={()=>{setCompose(true);setForm({...form,subject:`Re: ${selected.subject}`})}}>Responder</button>}</> : <div className="empty-reader"><b>✉</b><p>Selecione uma mensagem para ler.</p></div>}</article>
    </div>
  </section>;
}

function ClientHistory({ appointments }: any) {
  const completed = appointments.filter((a:any)=>a.status !== "Cancelado");
  const total = completed.reduce((sum:number,a:any)=>sum+(a.totalCents||0),0);
  return <section><div className="section-title"><div><small>SEU RELACIONAMENTO</small><h2>Histórico de atendimentos</h2></div></div><div className="history-summary"><article><span>Atendimentos</span><strong>{completed.length}</strong></article><article><span>Total em serviços</span><strong>{money(total)}</strong></article><article><span>Último serviço</span><strong>{completed[0]?.serviceName||"—"}</strong></article></div><div className="table-card"><table><thead><tr><th>Data</th><th>Serviço</th><th>Produto</th><th>Valor</th><th>Status</th></tr></thead><tbody>{completed.length?completed.map((a:any)=><tr key={a.id}><td>{formatDate(a.date)}</td><td><strong>{a.serviceName}</strong></td><td>{a.productName||"—"}</td><td>{money(a.totalCents)}</td><td>{a.status}</td></tr>):<tr><td colSpan={5} className="empty-table">Seu histórico aparecerá após os atendimentos.</td></tr>}</tbody></table></div></section>;
}

function LoyaltyCard({ snapshot, user }: any) {
  const target = Math.max(1, Number(snapshot?.loyaltyTarget || 8));
  const availableRewards = Math.max(0, Number(snapshot?.loyaltyAvailableRewards || 0));
  const progress = availableRewards > 0
    ? target
    : Math.min(target - 1, Math.max(0, Number(snapshot?.loyaltyProgress || 0)));
  const remaining = Math.max(0, target - progress);

  return (
    <section className="loyalty-page">
      <div className="section-title">
        <div>
          <small>BENEFÍCIO EXCLUSIVO</small>
          <h2>Meu cartão fidelidade</h2>
          <p className="section-description">Acompanhe seu progresso a cada atendimento realizado.</p>
        </div>
      </div>
      <div className="loyalty-card">
        <span>YURI BARBERSHOP</span>
        <h3>{user.name}</h3>
        <p>A cada {target} atendimentos finalizados e pagos, o próximo é por nossa conta.</p>
        <strong>{availableRewards > 0 ? "Cortesia disponível" : "Continue acumulando atendimentos"}</strong>
        <div className="loyalty-stamps" aria-label={`${progress} de ${target} atendimentos`}>
          {Array.from({ length: target }, (_, index) => (
            <i key={index} className={index < progress ? "filled" : ""}>
              {index < progress ? "✓" : "✂"}
            </i>
          ))}
        </div>
        {availableRewards > 0 ? (
          <div className="loyalty-reward-ready">🎁 Você conquistou um atendimento gratuito!</div>
        ) : (
          <small>Você tem {progress} de {target} atendimentos. Faltam {remaining}.</small>
        )}
        <p className="loyalty-rule">Somente atendimentos finalizados e pagos pelo administrador entram na contagem. A cortesia é liberada pela equipe da Yuri Barbershop.</p>
      </div>
    </section>
  );
}

function ReviewAndWaitlist({ onRefresh }: any) {
  const [rating,setRating]=useState(5); const [comment,setComment]=useState(""); const [message,setMessage]=useState("");
  async function post(payload:any){const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});setMessage(response.ok?"Enviado com sucesso.":"Não foi possível enviar.");if(response.ok)await onRefresh?.();}
  return <section className="review-page"><div className="section-title"><div><small>SUA OPINIÃO IMPORTA</small><h2>Avalie seu atendimento</h2></div></div><div className="google-review-promo"><div className="google-promo-brand"><span className="google-promo-icon">G</span><small>GOOGLE NEGÓCIOS</small></div><div className="google-promo-copy"><span>PRESENTE ESPECIAL</span><h3>Sua avaliação vale um presente</h3><p>Conte como foi sua experiência na Yuri Barbershop e ganhe <strong>um serviço adicional</strong> no próximo atendimento.</p><div className="google-promo-steps"><small><b>1</b> Avalie no Google</small><small><b>2</b> Mostre a publicação</small><small><b>3</b> Escolha seu adicional</small></div><em>Benefício individual, válido uma vez por cliente.</em></div><a className="google-review-button" href="https://g.page/r/CaO2Z7is9bPgEAE/review" target="_blank" rel="noreferrer"><span>Avaliar agora</span><small>Abrir Google Negócios →</small></a></div><div className="feedback-card"><small>AVALIAÇÃO INTERNA</small><h3>Como foi seu atendimento?</h3><p>Essa mensagem fica somente com nossa equipe e nos ajuda a melhorar cada detalhe.</p><div className="star-picker" aria-label="Nota do atendimento">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} estrela${n>1?"s":""}`} onClick={()=>setRating(n)} className={n<=rating?"active":""}>★</button>)}</div><textarea rows={5} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Conte como foi sua experiência..."/><button className="primary-button small" onClick={()=>post({action:"review",rating,comment})}>Enviar avaliação</button></div>{message&&<p className="form-message">{message}</p>}</section>;
}

function GrowthCenter({ data, onRefresh }: any) {
  const settings=data.settings||{}; const [form,setForm]=useState({monthlyGoal:(settings.monthlyGoalCents||500000)/100,loyaltyTarget:settings.loyaltyTarget||10,loyaltyReward:settings.loyaltyReward||"Um serviço adicional grátis"}); const [block,setBlock]=useState({date:"",time:"Dia inteiro",reason:"Folga"}); const average=data.reviews?.length?(data.reviews.reduce((s:number,r:any)=>s+r.rating,0)/data.reviews.length).toFixed(1):"—";
  async function save(payload:any){await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});await onRefresh?.();}
  return <section><div className="section-title"><div><small>GESTÃO E CRESCIMENTO</small><h2>Central de crescimento</h2></div></div><div className="growth-metrics"><article><span>Avaliação média</span><strong>{average} ★</strong></article><article><span>Lista de espera</span><strong>{data.waitlist?.filter((w:any)=>w.status==="Aguardando").length||0}</strong></article><article><span>Datas bloqueadas</span><strong>{data.scheduleBlocks?.length||0}</strong></article><article><span>Meta mensal</span><strong>{money(settings.monthlyGoalCents||500000)}</strong></article></div><div className="growth-grid"><div className="panel"><h3>Metas e fidelidade</h3><label>Meta mensal (R$)<input type="number" value={form.monthlyGoal} onChange={e=>setForm({...form,monthlyGoal:Number(e.target.value)})}/></label><label>Atendimentos para recompensa<input type="number" value={form.loyaltyTarget} onChange={e=>setForm({...form,loyaltyTarget:Number(e.target.value)})}/></label><label>Recompensa<input value={form.loyaltyReward} onChange={e=>setForm({...form,loyaltyReward:e.target.value})}/></label><button className="primary-button small" onClick={()=>save({action:"business-settings",...form})}>Salvar configurações</button></div><div className="panel"><h3>Bloquear agenda</h3><label>Data<input type="date" value={block.date} onChange={e=>setBlock({...block,date:e.target.value})}/></label><label>Horário<input value={block.time} onChange={e=>setBlock({...block,time:e.target.value})}/></label><label>Motivo<input value={block.reason} onChange={e=>setBlock({...block,reason:e.target.value})}/></label><button className="primary-button small" onClick={()=>save({action:"schedule-block",...block})}>Bloquear horário</button></div></div><div className="growth-grid"><div className="panel"><h3>Lista de espera</h3>{data.waitlist?.length?data.waitlist.map((w:any)=><div className="growth-row" key={w.id}><div><strong>{w.clientName}</strong><small>{w.serviceName} • {formatDate(w.preferredDate)} às {w.preferredTime}</small></div><button onClick={()=>save({action:"waitlist-status",id:w.id,status:"Atendido"})}>{w.status}</button></div>):<p>Ninguém na lista de espera.</p>}</div><div className="panel"><h3>Avaliações recentes</h3>{data.reviews?.length?data.reviews.slice(0,6).map((r:any)=><div className="growth-row" key={r.id}><div><strong>{r.clientName} • {"★".repeat(r.rating)}</strong><small>{r.comment||"Sem comentário"}</small></div></div>):<p>Nenhuma avaliação ainda.</p>}</div></div></section>;
}

function Promotions({ items, subscriptions=[], demo=false, track=true }: any) {
  const subscriber=subscriptions.some((item:any)=>item.status==="Ativa");
  const today=localDateKey();
  const visible=items.filter((item:any)=>(!item.validUntil||item.validUntil>=today)&&(item.audience!=="Assinantes"||subscriber));
  const [slide,setSlide]=useState(0); const current=visible[slide]||visible[0]||null;
  useEffect(()=>{if(!track||demo||!current?.id)return;fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"promotion-engagement",id:current.id,kind:"view"})}).catch(()=>{});},[current?.id,demo,track]);
  function openWhatsApp(){if(!current)return;if(track&&!demo)fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"promotion-engagement",id:current.id,kind:"click"})}).catch(()=>{});window.open(`https://wa.me/5562981007636?text=${encodeURIComponent(`Olá! Vi a promoção “${current.title}” no site da Yuri Barbershop e quero aproveitar.`)}`,"_blank","noopener,noreferrer");}
  return <section><div className="section-title"><div><small>OFERTAS ESPECIAIS</small><h2>Promoções da Yuri Barbershop</h2><p className="section-description">Ofertas organizadas em um só lugar, sem anúncios interrompendo sua navegação.</p></div></div>{current?<div className="promotion-carousel"><button aria-label="Promoção anterior" disabled={visible.length<2} onClick={()=>setSlide((slide-1+visible.length)%visible.length)}>‹</button><article>{current.imageKey?<img src={storedImage(current.imageKey)} alt={`Criativo da promoção ${current.title}`}/>:<div className="promotion-creative-placeholder">✂</div>}<div><span>● PROMOÇÃO ATIVA</span><h3>{current.title}</h3><p>{current.description}</p><div className="promotion-meta"><small>{current.validUntil?`Válida até ${formatDate(current.validUntil)}`:"Por tempo limitado"}</small><small>{current.audience==="Assinantes"?"Exclusiva para assinantes":"Disponível para todos"}</small></div><button className="promotion-whatsapp" onClick={openWhatsApp}>Chamar no WhatsApp</button></div></article><button aria-label="Próxima promoção" disabled={visible.length<2} onClick={()=>setSlide((slide+1)%visible.length)}>›</button>{visible.length>1&&<div className="carousel-dots">{visible.map((_:any,i:number)=><button key={i} aria-label={`Ver promoção ${i+1}`} onClick={()=>setSlide(i)} className={i===slide?"active":""}/>)}</div>}</div>:<div className="empty-promotion"><b>✂</b><h3>Novidades em breve</h3><p>Acompanhe nossas promoções por aqui e pelo Instagram.</p></div>}</section>;
}

function Location() {
  return <section><div className="section-title"><div><small>COMO CHEGAR</small><h2>Localização da barbearia</h2></div></div><div className="location-card"><div className="location-pin">⌖</div><div><span>YURI BARBERSHOP</span><h3>Abra a rota no Google Maps</h3><p>Consulte o melhor caminho e chegue com alguns minutos de antecedência para o seu atendimento.</p><a className="maps-button" href="https://maps.app.goo.gl/fSRqRd1iQVJbDej16" target="_blank" rel="noreferrer"><b>G</b> Abrir no Google Maps</a></div></div><div className="hours-card"><h3>Horários para agendamento</h3><p><strong>Segunda a sexta</strong><span>18h às 20h30</span></p><p><strong>Sábado</strong><span>8h às 20h30</span></p><p><strong>Domingo</strong><span>8h às 12h</span></p></div></section>;
}

function storedImage(key?:string) { return key ? `/api/upload?key=${encodeURIComponent(key)}` : ""; }

function ProductGallery({items,loading=false,error="",onRetry}:any) {
  return <section><div className="section-title"><div><small>PRODUTOS</small><h2>Produtos disponíveis</h2></div></div>
    {loading ? <div className="shop-grid product-loading-grid" aria-label="Carregando produtos" aria-busy="true">{[1,2,3].map((item)=><div className="shop-card product-skeleton" key={item}><div className="shop-image"/><div><span/><span/><span/></div></div>)}</div>
      : error ? <div className="product-catalog-error" role="alert"><strong>Não foi possível carregar os produtos.</strong><p>{error}</p>{onRetry&&<button className="secondary-button small" onClick={onRetry}>Tentar novamente</button>}</div>
      : <div className="shop-grid">{items.length ? items.map((p:any)=><article className="shop-card" key={p.id}><div className={`shop-image ${p.imageKey?"":"image-error"}`}><span className="shop-image-placeholder">◇</span>{p.imageKey&&<img src={storedImage(p.imageKey)} alt={p.name} onError={(event)=>{event.currentTarget.style.display="none";event.currentTarget.parentElement?.classList.add("image-error");}}/>}</div><div><small>{p.stock>0?"DISPONÍVEL":"CONSULTE O ESTOQUE"}</small><h3>{p.name}</h3><p>{p.description}</p><strong>R$ {Number(p.price).toFixed(2).replace(".",",")}</strong></div></article>) : <div className="empty-promotion"><h3>Catálogo vazio</h3><p>Ainda não há produtos cadastrados para exibição.</p></div>}</div>}
  </section>;
}

function ProductAds({items}:any){if(!items.length)return null;return <section className="product-ads"><small>PRODUTOS EM DESTAQUE</small><div>{items.map((p:any)=><article key={p.id}>{p.imageKey&&<img src={storedImage(p.imageKey)} alt={p.name}/>}<div><h3>{p.name}</h3><p>{p.description}</p><strong>R$ {Number(p.price).toFixed(2).replace(".",",")}</strong></div></article>)}</div></section>}

function ProductCampaignManager({items,onRefresh}:any){const [selected,setSelected]=useState("");const [showOnLogin,setShowOnLogin]=useState(false);const [message,setMessage]=useState("");async function save(){if(!selected){setMessage("Escolha um produto.");return;}const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"product-campaign",id:Number(selected),featured:true,showOnLogin})});setMessage(response.ok?"Produto incluído nas campanhas.":"Não foi possível destacar o produto.");if(response.ok)await onRefresh()}return <section className="product-campaign-manager"><div className="section-title"><div><small>ANÚNCIOS INTERNOS</small><h2>Destacar produto</h2><p className="section-description">Use a foto e os dados já cadastrados para divulgar um produto.</p></div></div><div className="promotion-form"><label>Produto<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecione</option>{items.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="campaign-check"><input type="checkbox" checked={showOnLogin} onChange={e=>setShowOnLogin(e.target.checked)}/> Mostrar também no pop-up da entrada</label><button className="primary-button small" onClick={save}>Adicionar às campanhas</button></div>{message&&<p className="form-message">{message}</p>}</section>}

function StyleCatalog({items}:any) {
  const [filter,setFilter]=useState("todos");const visible=filter==="todos"?items:items.filter((i:any)=>i.category===filter);
  return <section><div className="section-title"><div><small>INSPIRAÇÕES</small><h2>Catálogo de estilos e procedimentos</h2><p className="section-description">Escolha uma referência e mostre ao Yuri durante o atendimento.</p></div></div><div className="catalog-tabs"><button className={filter==="todos"?"active":""} onClick={()=>setFilter("todos")}>Todos</button><button className={filter==="corte"?"active":""} onClick={()=>setFilter("corte")}>Cortes</button><button className={filter==="barba"?"active":""} onClick={()=>setFilter("barba")}>Barbas</button><button className={filter==="quimica"?"active":""} onClick={()=>setFilter("quimica")}>Procedimentos químicos</button></div><div className="style-grid">{visible.length?visible.map((item:any)=><article className="style-card" key={item.id}><div>{item.imageKey?<img src={storedImage(item.imageKey)} alt={item.name}/>:<span>✂</span>}</div><small>{item.category==="barba"?"BARBA":item.category==="quimica"?"PROCEDIMENTO QUÍMICO":"CORTE"}</small><h3>{item.name}</h3>{item.description&&<p>{item.description}</p>}</article>):<div className="empty-promotion"><h3>Catálogo em preparação</h3><p>Os modelos cadastrados pelo administrador aparecerão aqui.</p></div>}</div></section>;
}

async function uploadImage(file:File|null) {
  if(!file) return "";
  const optimized=await optimizeImage(file);
  const data=new FormData();data.append("file",optimized,optimized.name);
  const response=await fetch("/api/upload",{method:"POST",body:data});
  if(!response.ok){const result=await response.json().catch(()=>({}));throw new Error(result.error||"Falha no envio da imagem")}
  return (await response.json()).key as string;
}

async function optimizeImage(file:File){
  if(file.size<=1_500_000)return file;
  const image=await createImageBitmap(file);
  const scale=Math.min(1,1600/Math.max(image.width,image.height));
  const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
  canvas.getContext("2d")?.drawImage(image,0,0,canvas.width,canvas.height);image.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.82));
  if(!blob)throw new Error("Não foi possível preparar a imagem");
  return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"});
}

function SubscriptionClient({items,demo,onRefresh}:any) {
  const [message,setMessage]=useState("");const [sending,setSending]=useState(false);const current=items[0];const active=current?.status==="Ativa"&&current?.endDate>=new Date().toISOString().slice(0,10);
  async function requestPlan(){if(demo){setMessage("Solicitação registrada na demonstração.");return;}setSending(true);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"subscription-request"})});const data=await response.json();setSending(false);setMessage(response.ok?"Solicitação enviada. Aguarde a confirmação do pagamento.":data.error||"Não foi possível solicitar a assinatura.");if(response.ok)await onRefresh();}
  return <section className="membership-page"><div className="membership-hero"><span>♛ CLUBE YURI</span><h2>Visual sempre em dia,<br/>por um valor fixo.</h2><p>Plano individual da Yuri Barbershop para você cuidar do visual durante todo o mês.</p><div className="membership-price"><strong>R$ 120</strong><small>,00 / 30 dias</small></div>{current?<><div className={`membership-status ${active?"active":""}`}><b>{active?"ASSINATURA ATIVA":current.status.toUpperCase()}</b>{current.startDate&&<span>{formatDate(current.startDate)} até {formatDate(current.endDate)}</span>}</div>{current.adminMessage&&<div className="membership-admin-message"><b>Mensagem da barbearia</b><p>{current.adminMessage}</p></div>}</>:<button className="membership-action" disabled={sending} onClick={requestPlan}>{sending?"Enviando...":"Quero assinar"}</button>}{message&&<p className="membership-message">{message}</p>}</div><div className="membership-benefits"><article><b>✓</b><div><h3>Serviços ilimitados</h3><p>Utilize os serviços da barbearia durante o período ativo do plano.</p></div></article><article><b>✓</b><div><h3>Plano pessoal</h3><p>Benefício exclusivo e intransferível para o usuário titular.</p></div></article><article><b>✓</b><div><h3>Validade de 30 dias</h3><p>O período começa após a confirmação do pagamento pelo administrador.</p></div></article><article><b>✓</b><div><h3>Agendamento necessário</h3><p>Atendimentos dependem dos horários disponíveis e confirmação pelo WhatsApp.</p></div></article></div><div className="membership-rules"><h3>Regras importantes</h3><p>A assinatura não pode ser compartilhada. Os atendimentos são pessoais, mediante agendamento, e não acumulam após o vencimento. Produtos não estão incluídos no plano.</p></div></section>;
}

function SubscriptionCreative({campaigns}:any){const campaign=campaigns?.[0];if(!campaign)return null;return <div className="membership-creative">{campaign.imageKey&&<img src={storedImage(campaign.imageKey)} alt={campaign.title}/>}<div><small>CONHEÇA O CLUBE YURI</small><h3>{campaign.title}</h3><p>{campaign.description}</p></div></div>}

function CampaignManager({campaigns,onRefresh}:any){const [open,setOpen]=useState(false);const [file,setFile]=useState<File|null>(null);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");const [form,setForm]=useState({title:"Clube Yuri",description:"Visual sempre em dia por um valor fixo.",showOnLogin:true});async function save(){if(!file){setMessage("Escolha a imagem do criativo.");return;}try{setSaving(true);const imageKey=await uploadImage(file);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"subscription-campaign",...form,imageKey})});if(!response.ok)throw new Error();setOpen(false);setMessage("Criativo de assinatura publicado.");await onRefresh();}catch{setMessage("Não foi possível publicar o criativo.");}finally{setSaving(false)}}return <section className="campaign-manager"><div className="section-title"><div><small>DIVULGAÇÃO DO CLUBE</small><h2>Criativos da assinatura</h2></div><button className="primary-button small" onClick={()=>setOpen(!open)}>+ Carregar criativo</button></div>{open&&<div className="promotion-form"><label>Título<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Texto<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Imagem do criativo<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label className="campaign-check"><input type="checkbox" checked={form.showOnLogin} onChange={e=>setForm({...form,showOnLogin:e.target.checked})}/> Destacar também na entrada</label><button className="primary-button small" disabled={saving} onClick={save}>{saving?"Enviando...":"Publicar criativo"}</button></div>}{message&&<p className="form-message">{message}</p>}<SubscriptionCreative campaigns={campaigns}/></section>}

function SubscriptionAdmin({items,onRefresh}:any) {
  const [working,setWorking]=useState<number|null>(null);const [messageFor,setMessageFor]=useState<number|null>(null);const [message,setMessage]=useState("");
  async function act(item:any,operation:string){setWorking(item.id);const action=operation==="activate"?"subscription-activate":"subscription-manage";const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,id:item.id,operation,message})});setWorking(null);if(response.ok){setMessageFor(null);setMessage("");await onRefresh();}}
  return <section><div className="section-title"><div><small>CLUBE YURI</small><h2>Gestão de assinantes</h2><p className="section-description">Ative após o pagamento e acompanhe cada cliente durante o período.</p></div><span className="client-count">{items.filter((i:any)=>i.status==="Ativa").length} ativas</span></div><div className="subscription-admin-list">{items.length?items.map((item:any)=><article className="subscriber-card" key={item.id}><div className="subscriber-head"><div><strong>{item.clientName}</strong><small>{item.clientEmail}</small></div><span className={`subscriber-badge ${item.status.toLowerCase().replaceAll(" ","-")}`}>{item.status}</span></div><div className="subscriber-dates"><span>Valor<b>{money(item.priceCents)}</b></span><span>Início<b>{item.startDate?formatDate(item.startDate):"—"}</b></span><span>Vencimento<b>{item.endDate?formatDate(item.endDate):"—"}</b></span></div>{item.adminMessage&&<p className="subscriber-last-message">Última mensagem: {item.adminMessage}</p>}<div className="subscriber-actions">{item.status!=="Ativa"&&<button className="accept-booking" onClick={()=>act(item,"activate")}>✓ Aceitar / ativar</button>}<button onClick={()=>act(item,"extend")}>+30 dias</button>{item.status==="Bloqueada"?<button onClick={()=>act(item,"Ativa")}>Reativar</button>:<button className="block-subscription" onClick={()=>act(item,"Bloqueada")}>Bloquear</button>}<button className="cancel-booking" onClick={()=>act(item,"Cancelada")}>Cancelar</button><button className="message-booking" onClick={()=>{setMessageFor(messageFor===item.id?null:item.id);setMessage(item.adminMessage||"")}}>Mensagem</button></div>{messageFor===item.id&&<div className="subscriber-message-form"><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Digite uma mensagem para o assinante..."/><button className="primary-button small" disabled={!message.trim()||working===item.id} onClick={()=>act(item,"message")}>Enviar</button></div>}</article>):<div className="empty-promotion"><h3>Nenhuma solicitação</h3><p>Os clientes que solicitarem o plano aparecerão aqui.</p></div>}</div></section>;
}

function ClientProfile({ user, profile, demo, onRefresh }: any) {
  const [form, setForm] = useState({ name: profile?.name || user.name || "", phone: profile?.phone || "", birthDate: profile?.birthDate || "" });
  const [message, setMessage] = useState("");
  useEffect(() => setForm({ name: profile?.name || user.name || "", phone: profile?.phone || "", birthDate: profile?.birthDate || "" }), [profile, user.name]);
  async function save() {
    if (!form.name.trim() || !form.phone.trim()) { setMessage("Preencha nome e telefone."); return; }
    if (demo) { setMessage("Dados salvos na demonstração."); return; }
    const response = await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "profile", ...form }) });
    setMessage(response.ok ? "Dados atualizados com sucesso." : "Não foi possível salvar os dados.");
    if (response.ok) await onRefresh();
  }
  return <section className="form-panel"><small>MINHA CONTA</small><h2>Dados do cliente</h2><div className="form-grid"><label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Telefone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(62) 99999-9999"/></label><label>E-mail<input value={user.email} disabled/></label><label>Data de nascimento<input type="date" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})}/></label></div><button className="primary-button small" onClick={save}>Salvar alterações</button>{message&&<p className="form-message">{message}</p>}</section>;
}

function BookingChat({
  user, demo, services, products, profile, selectedService, setSelectedService,
  selectedTime, setSelectedTime, bookingDate, setBookingDate, notice, setNotice,
  confirmBooking, promotions, subscriptionCampaigns, onNavigate,
  collaborators, selectedCollaboratorId, setSelectedCollaboratorId,
}: any) {
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState<"schedule" | "notice" | "">("");
  const [customer, setCustomer] = useState({ name: user.name || "", phone: "", birthDate: "" });
  const [formError, setFormError] = useState("");
  const [greeting, setGreeting] = useState("Olá");
  const [acceptedDelayRule, setAcceptedDelayRule] = useState(false);
  const times = bookingTimesForDate(bookingDate);
  const firstName = user.name?.split(" ")[0] || "cliente";
  const chosen = services.find((service: any) => service.name === selectedService);
  const money = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");
  }, []);
  useEffect(() => {
    if (profile) setCustomer({ name: profile.name || user.name || "", phone: profile.phone || "", birthDate: profile.birthDate || "" });
  }, [profile, user.name]);

  const isRegistered = Boolean(customer.name.trim() && customer.phone.replace(/\D/g, "").length >= 10 && customer.birthDate);
  const formattedDate = bookingDate ? new Date(`${bookingDate}T12:00:00`).toLocaleDateString("pt-BR") : "";
  const total = chosen?.price || 0;
  const activeCollaborators = (collaborators || []).filter((item:any)=>item.active);
  const selectedCollaborator = activeCollaborators.find((item:any)=>item.id===selectedCollaboratorId);

  function restart() {
    setStep(-1); setMode(""); setSelectedService(""); setBookingDate(""); setSelectedTime("");
    setNotice(""); setFormError(""); setAcceptedDelayRule(false); setSelectedCollaboratorId(0);
  }
  function chooseDate() {
    if (!bookingDate) return;
    setSelectedTime(""); setNotice("");
    if (mode === "schedule") setStep(4);
    else setStep(isRegistered ? 6 : 5);
  }
  function finishRegistration() {
    if (!customer.name.trim() || customer.phone.replace(/\D/g, "").length < 10 || !customer.birthDate) {
      setFormError("Preencha seu nome, telefone completo e data de aniversário."); return;
    }
    setFormError(""); setStep(6);
  }

  const requestKind = mode === "schedule" ? "solicitar um horário" : "avisar o dia em que pretendo ir";
  const confirmationText = encodeURIComponent(
    `Olá, Yuri! Gostaria de ${requestKind}.\n\nCliente: ${customer.name}\nWhatsApp: ${customer.phone}\nServiço: ${selectedService}\nValor: ${money(total)}\nData: ${formattedDate}${mode === "schedule" ? `\nHorário desejado: ${selectedTime}` : "\nSem reserva de horário"}\n\n${mode === "schedule" ? "Sei que o horário depende da sua confirmação pelo WhatsApp." : "Estou apenas avisando o dia em que pretendo comparecer."}`,
  );
  const whatsappConfirmationUrl = `https://wa.me/5562981007636?text=${confirmationText}`;
  const directWhatsappUrl = "https://wa.me/5562981007636?text=Ol%C3%A1%2C%20Yuri!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida.";
  const storyItems = [
    ...(promotions || []).filter((item: any) => item.imageKey).map((item: any) => ({ id: `promotion-${item.id}`, label: "PROMOÇÃO", title: item.title, description: item.description, imageKey: item.imageKey, target: "promocoes", action: "Ver promoção" })),
    ...(products || []).filter((item: any) => item.featured && item.imageKey).map((item: any) => ({ id: `product-${item.id}`, label: "PRODUTO EM DESTAQUE", title: item.name, description: `${item.description || "Disponível na barbearia"} • ${money(item.price)}`, imageKey: item.imageKey, target: "produtos", action: "Ver produto" })),
    ...(subscriptionCampaigns || []).filter((item: any) => item.imageKey).map((item: any) => ({ id: `subscription-${item.id}`, label: "CLUBE YURI", title: item.title, description: item.description, imageKey: item.imageKey, target: "assinatura", action: "Conhecer o plano" })),
  ];

  return (
    <div className="booking-with-ads">
      <section className="chat-booking">
        <div className="chat-top">
          <div className="bot-avatar brand-avatar"><img src="/brand/yuri-barbershop-logo.png" alt="" /></div>
          <div><strong>Assistente Yuri</strong><small><i /> atendimento online</small></div><span>✂</span>
        </div>
        <div className="chat-progress"><span style={{ width: step < 0 ? "0%" : `${Math.min(100, (Math.min(step, 7) + 1) * 14)}%` }} /></div>
        <div className="chat-body conversational-flow" aria-live="polite">
          {step === -1 && <div className="chat-welcome"><div className="welcome-mark brand-avatar"><img src="/brand/yuri-barbershop-logo.png" alt="Logo Yuri Barbershop" /></div><span>ATENDIMENTO ONLINE</span><h2>Reserve sua experiência</h2><p>Escolha seu serviço, profissional e horário. Enviaremos seu pedido pelo WhatsApp para confirmação.</p><button className="primary-button start-chat" onClick={() => setStep(0)}>Iniciar conversa</button></div>}

          {step >= 0 && <><BotBubble>{greeting}, {firstName}! Tudo bem? 👋</BotBubble><BotBubble>Posso te ajudar? Você quer solicitar um serviço?</BotBubble></>}
          {step === 0 && <ChatOptions>
            <ChatChoice icon="✓" title="Sim, quero" subtitle="Escolher serviço, data e atendimento" onClick={() => setStep(1)} />
            <ChatChoice icon="×" title="Não, obrigado" subtitle="Ver outras opções da barbearia" onClick={() => setStep(90)} />
          </ChatOptions>}

          {step >= 1 && step < 90 && <UserBubble>Sim, quero solicitar um serviço.</UserBubble>}
          {step === 1 && <><BotBubble>Perfeito! Qual serviço você gostaria de fazer? Os valores aparecem para você escolher com tranquilidade.</BotBubble><ChatOptions>
            {services.map((service: any) => <ChatChoice key={service.id} icon="✂" title={service.name} subtitle={`${service.time || "Tempo informado no atendimento"} • ${money(service.price)}`} onClick={() => { setSelectedService(service.name); setStep(activeCollaborators.length>1?15:2); if(activeCollaborators.length===1)setSelectedCollaboratorId(activeCollaborators[0].id); }} />)}
          </ChatOptions></>}

          {step >= 2 && step < 90 && step!==15 && selectedService && <UserBubble>{selectedService} — {money(total)}</UserBubble>}
          {step === 15 && <><UserBubble>{selectedService} — {money(total)}</UserBubble><BotBubble>Você prefere ser atendido por qual profissional?</BotBubble><ChatOptions><ChatChoice icon="✂" title="Qualquer profissional" subtitle="Escolheremos conforme a disponibilidade" onClick={()=>{setSelectedCollaboratorId(0);setStep(2)}}/>{activeCollaborators.map((item:any)=><ChatChoice key={item.id} icon="♙" title={item.name} subtitle="Barbeiro disponível" onClick={()=>{setSelectedCollaboratorId(item.id);setStep(2)}}/>)}</ChatOptions></>}
          {step === 2 && selectedCollaborator && <UserBubble>Profissional: {selectedCollaborator.name}</UserBubble>}
          {step === 2 && <><BotBubble>Ótima escolha! Como você prefere continuar?</BotBubble><ChatOptions>
            <ChatChoice icon="◷" title="Escolher data e horário" subtitle="Pedido sujeito à confirmação no WhatsApp" onClick={() => { setMode("schedule"); setStep(3); }} />
            <ChatChoice icon="→" title="Apenas avisar o dia" subtitle="Sem reserva: informe quando pretende vir" onClick={() => { setMode("notice"); setStep(3); }} />
          </ChatOptions></>}

          {step >= 3 && step < 90 && <UserBubble>{mode === "schedule" ? "Quero escolher uma data e um horário." : "Quero apenas avisar o dia em que vou."}</UserBubble>}
          {step === 3 && <><BotBubble>Combinado! Qual dia você pretende vir?</BotBubble><div className="chat-date"><label>Escolha a data<input type="date" min={new Date().toISOString().slice(0, 10)} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} /></label><button className="date-continue" disabled={!bookingDate} onClick={chooseDate}>{mode === "schedule" ? "Continuar para os horários" : "Continuar atendimento"}</button></div></>}

          {step >= 4 && step < 90 && bookingDate && <UserBubble>{new Date(`${bookingDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</UserBubble>}
          {step === 4 && mode === "schedule" && <><BotBubble>Qual horário você gostaria? O Yuri confirmará a disponibilidade pelo WhatsApp.</BotBubble><div className="chat-times">{times.map((time: string) => <button key={time} onClick={() => { setSelectedTime(time); setStep(isRegistered ? 6 : 5); }}>{time}</button>)}</div>{!times.length && <p className="form-error">A barbearia não atende nesta data. Escolha outro dia.</p>}</>}

          {step >= 5 && step < 90 && mode === "schedule" && selectedTime && <UserBubble>{selectedTime}</UserBubble>}
          {step === 5 && <><BotBubble>Antes de preparar a mensagem, preciso confirmar seus dados.</BotBubble><div className="client-register">
            <label>Seu nome completo<input value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} placeholder="Digite seu nome" /></label>
            <label>Telefone / WhatsApp<input value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} placeholder="(62) 99999-9999" inputMode="tel" /></label>
            <label>Data de aniversário<input type="date" value={customer.birthDate} onChange={event => setCustomer({ ...customer, birthDate: event.target.value })} /></label>
            {customer.birthDate && <div className="birthday-gift"><b>🎁 Presente para você!</b><span>Você ganhará um corte grátis de presente no seu aniversário.</span></div>}
            {formError && <p className="form-error">{formError}</p>}<button className="primary-button" onClick={finishRegistration}>Continuar</button>
          </div></>}

          {step >= 6 && step < 90 && <UserBubble>{isRegistered ? "Meus dados estão corretos." : "Cadastro preenchido."}</UserBubble>}
          {step === 6 && <><BotBubble>Perfeito, {customer.name.split(" ")[0]}! Confira seu pedido antes de abrir o WhatsApp:</BotBubble><div className="booking-summary">
            <span>Serviço<strong>{selectedService}</strong></span><span>Data<strong>{formattedDate}</strong></span>
            {mode === "schedule" && <span>Horário desejado<strong>{selectedTime}</strong></span>}
            {mode === "notice" && <span>Forma de atendimento<strong>Somente aviso do dia, sem reserva</strong></span>}
            <span className="summary-total">Valor do atendimento<strong>{money(total)}</strong></span>
            <span>Profissional<strong>{selectedCollaborator?.name || "Conforme disponibilidade"}</strong></span>
            <div className="arrival-warning"><b>📱 Envio pelo WhatsApp</b><p>{mode === "schedule" ? "O horário ainda não está confirmado. Envie o pedido e aguarde o Yuri confirmar a disponibilidade." : "A mensagem avisará o dia da sua visita, mas não reservará um horário."}</p><label><input type="checkbox" checked={acceptedDelayRule} onChange={event => setAcceptedDelayRule(event.target.checked)} /> Conferi os dados e quero continuar.</label></div>
            {acceptedDelayRule ? <a className="primary-button whatsapp-confirm" href={whatsappConfirmationUrl} target="_blank" rel="noreferrer" onClick={() => setStep(7)}>Confirmar e abrir WhatsApp</a> : <button className="primary-button" disabled>Confirmar e abrir WhatsApp</button>}
          </div></>}

          {step === 7 && <><div className="chat-success"><b>✓</b><h3>Mensagem preparada!</h3><p>Continue no WhatsApp para enviar o pedido ao Yuri.</p><a className="whatsapp-confirm" href={whatsappConfirmationUrl} target="_blank" rel="noreferrer">Abrir WhatsApp novamente</a></div><button className="restart-chat" onClick={restart}>Iniciar outro atendimento</button></>}

          {step === 90 && <><UserBubble>Não, obrigado.</UserBubble><BotBubble>Tudo bem! Posso ajudar com outra coisa?</BotBubble><ChatOptions>
            <ChatChoice icon="✂" title="Ver serviços e valores" subtitle="Conheça todas as opções" onClick={() => setStep(1)} />
            <ChatChoice icon="★" title="Ver promoções" subtitle="Confira as ofertas ativas" onClick={() => onNavigate("promocoes")} />
            <ChatChoice icon="◇" title="Ver produtos" subtitle="Cuidados para cabelo e barba" onClick={() => onNavigate("produtos")} />
            <ChatChoice icon="⌖" title="Ver localização" subtitle="Abra o endereço da barbearia" onClick={() => onNavigate("localizacao")} />
            <a className="chat-choice" href={directWhatsappUrl} target="_blank" rel="noreferrer"><span>◉</span><div><strong>Falar pelo WhatsApp</strong><small>Tire uma dúvida diretamente com o Yuri</small></div><b>›</b></a>
            <ChatChoice icon="×" title="Encerrar atendimento" subtitle="Finalizar esta conversa" onClick={() => setStep(91)} />
          </ChatOptions></>}
          {step === 91 && <><UserBubble>Encerrar atendimento.</UserBubble><BotBubble>Obrigado pela visita! Quando precisar, estarei por aqui. Até logo! 👋</BotBubble><ChatOptions><ChatChoice icon="↻" title="Voltar ao início" subtitle="Começar uma nova conversa" onClick={restart} /><a className="chat-choice" href={directWhatsappUrl} target="_blank" rel="noreferrer"><span>◉</span><div><strong>Falar no WhatsApp</strong><small>Conversar diretamente com o Yuri</small></div><b>›</b></a></ChatOptions></>}
        </div>
      </section>
      <StoryAds items={storyItems} onNavigate={onNavigate} />
    </div>
  );
}
function StoryAds({ items, onNavigate }: any) {
  const [open, setOpen] = useState(true);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (!open || items.length < 2) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % items.length), 8000);
    return () => window.clearInterval(timer);
  }, [open, items.length]);
  if (!open || !items.length) return null;
  const current = items[slide % items.length];
  return (
    <aside className="story-ad" aria-label="Destaques da Yuri Barbershop">
      <div className="story-bars" aria-hidden="true">
        {items.map((item: any, index: number) => <i key={item.id} className={index === slide ? "active" : index < slide ? "seen" : ""} />)}
      </div>
      <button className="story-close" onClick={() => setOpen(false)} aria-label="Fechar anúncio">×</button>
      <img src={storedImage(current.imageKey)} alt={current.title} />
      <div className="story-shade" />
      <div className="story-copy">
        <small>{current.label}</small>
        <h3>{current.title}</h3>
        {current.description && <p>{current.description}</p>}
        <button onClick={() => onNavigate(current.target)}>{current.action} <span>→</span></button>
      </div>
      {items.length > 1 && <div className="story-nav"><button aria-label="Anúncio anterior" onClick={() => setSlide((slide - 1 + items.length) % items.length)}>‹</button><button aria-label="Próximo anúncio" onClick={() => setSlide((slide + 1) % items.length)}>›</button></div>}
    </aside>
  );
}

function BotBubble({ children }: any) {
  return (
    <div className="bubble-row">
      <div className="tiny-bot">Y</div>
      <div className="bubble bot-bubble">{children}</div>
    </div>
  );
}
function UserBubble({ children }: any) {
  return <div className="bubble user-bubble">{children}</div>;
}
function ChatOptions({ children }: any) {
  return <div className="chat-options">{children}</div>;
}
function ChatChoice({ icon, title, subtitle, onClick }: any) {
  return (
    <button className="chat-choice" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <b>›</b>
    </button>
  );
}

function Metric({ label, value, hint, tone = "" }: any) {
  return (
    <article className={`metric ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{hint}</span>
    </article>
  );
}
function Appointment(a: any) {
  return (
    <div className="appointment">
      <time>{a.time}</time>
      <div className="avatar small-avatar">{a.client[0]}</div>
      <div>
        <strong>{a.client}</strong>
        <small>{a.service}</small>
      </div>
      <span className={a.status === "Pendente" ? "pending" : "status"}>
        {a.status}
      </span>
      <button>•••</button>
    </div>
  );
}
function CollaboratorManager({ collaborators, services, links, appointments, settlements, onRefresh }: any) {
  const [form,setForm]=useState({id:0,name:"",email:"",phone:"",password:"",defaultCommissionPercent:40,active:true});
  const [status,setStatus]=useState(""); const [saving,setSaving]=useState(false);
  const [serviceEditor,setServiceEditor]=useState<any>(null);
  async function save(){setSaving(true);setStatus("");const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"collaborator-save",...form})});const data=await response.json();setSaving(false);if(!response.ok){setStatus(data.error||"Não foi possível salvar.");return;}setForm({id:0,name:"",email:"",phone:"",password:"",defaultCommissionPercent:40,active:true});setStatus("Colaborador salvo com sucesso.");await onRefresh();}
  async function saveService(collaboratorId:number,serviceId:number,commissionPercent:any,active:boolean){await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"collaborator-service",collaboratorId,serviceId,commissionPercent,active})});await onRefresh();}
  const finalized=(appointments||[]).filter((item:any)=>item.status==="Finalizado");
  return <section><div className="section-title"><div><small>EQUIPE E COMISSÕES</small><h2>Barbeiros colaboradores</h2></div><button className="primary-button small" onClick={()=>setForm({id:0,name:"",email:"",phone:"",password:"",defaultCommissionPercent:40,active:true})}>+ Novo colaborador</button></div>
    <div className="form-panel collaborator-form"><h3>{form.id?"Editar colaborador":"Cadastrar colaborador"}</h3><div className="form-grid"><label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>E-mail de acesso<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Telefone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>{!form.id&&<label>Senha temporária<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}<label>Comissão padrão (%)<input type="number" min="0" max="100" step="1" value={form.defaultCommissionPercent} onChange={e=>setForm({...form,defaultCommissionPercent:Math.max(0,Math.min(100,Number(e.target.value)))})}/><small>Editável entre 0% e 100%.</small></label><label className="check-label"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Colaborador ativo</label></div><button className="primary-button small" disabled={saving||!form.name||!form.email} onClick={save}>{saving?"Salvando...":"Salvar colaborador"}</button>{status&&<p className="form-message">{status}</p>}</div>
    <div className="collaborator-grid">{collaborators.map((item:any)=>{const done=finalized.filter((a:any)=>a.collaboratorId===item.id);const earnings=done.reduce((sum:number,a:any)=>sum+(a.commissionCents||0),0);return <article className="collaborator-card" key={item.id}><header><div className="avatar">{item.name[0]}</div><div><h3>{item.name}</h3><small>{item.owner?"Proprietário":"Barbeiro colaborador"} • {item.active?"Ativo":"Bloqueado"}</small></div></header><div className="collaborator-stats"><span>Comissão padrão<b>{item.defaultCommissionPercent}%</b></span><span>Finalizados<b>{done.length}</b></span><span>Comissões<b>{money(earnings)}</b></span></div><div className="agenda-actions"><button onClick={()=>setForm({id:item.id,name:item.name,email:item.email,phone:item.phone||"",password:"",defaultCommissionPercent:item.defaultCommissionPercent,active:item.active})}>Editar dados e %</button><button onClick={()=>setServiceEditor(serviceEditor===item.id?null:item.id)}>Comissão por serviço</button></div>{serviceEditor===item.id&&<div className="service-commission-list"><p>Deixe vazio para usar os {item.defaultCommissionPercent}% padrão.</p>{services.map((service:any)=>{const link=links.find((l:any)=>l.collaboratorId===item.id&&l.serviceId===service.id);return <div key={service.id}><span>{service.name}</span><input aria-label={`Comissão de ${service.name}`} type="number" min="0" max="100" defaultValue={link?.commissionPercent??""} placeholder={`${item.defaultCommissionPercent}%`} onBlur={e=>saveService(item.id,service.id,e.target.value,true)}/><b>%</b></div>})}</div>}</article>})}</div>
    <p className="form-hint">A comissão é calculada apenas quando o atendimento é marcado como finalizado. Alterar o percentual não modifica atendimentos antigos.</p>
  </section>;
}

function Agenda({appointments:rows=[],onRefresh,barberMode=false}:any) {
  const [messageFor,setMessageFor]=useState<number|null>(null);const [message,setMessage]=useState("");const [saving,setSaving]=useState<number|null>(null);const [feedback,setFeedback]=useState("");const [paymentMethod,setPaymentMethod]=useState("Pix");
  async function update(item:any,status:string){
    if(item.status==="Cancelado"&&status==="Cancelado")return;
    if(status==="Finalizado"&&!window.confirm(`Finalizar o atendimento de ${item.clientName} e lançar ${money(item.totalCents)} no caixa?`))return;
    setSaving(item.id);setFeedback("");
    const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"appointment-status",id:item.id,status,paymentMethod,message:messageFor===item.id?message:item.adminMessage||""})});
    const result=await response.json().catch(()=>({}));
    setSaving(null);
    if(response.ok){setMessageFor(null);setMessage("");await onRefresh();}else setFeedback(result.error||"Não foi possível atualizar o agendamento.");
  }
  return (
    <section>
      <div className="section-title">
        <div>
          <small>AGENDA</small>
          <h2>Agendamentos de hoje</h2>
        </div>
        {!barberMode&&<button className="primary-button small" onClick={()=>document.getElementById("agenda-list")?.scrollIntoView({behavior:"smooth"})}>Ver agenda completa</button>}
      </div>
      <div className="panel" id="agenda-list"><label className="payment-selector">Forma de pagamento ao finalizar<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option><option>Assinatura</option><option>Cortesia</option></select></label>{feedback&&<p className="form-message" role="status">{feedback}</p>}
        {rows.length ? rows.map((a:any)=><div className="agenda-admin-row" key={a.id}><Appointment time={a.time} client={a.clientName} service={`${a.serviceName} • ${formatDate(a.date)}${a.collaboratorName?` • ${a.collaboratorName}`:""}`} status={a.status}/><div className="agenda-actions">{a.status==="Cancelado"?<span className="appointment-action-note">Agendamento cancelado</span>:<><button className="accept-booking" disabled={saving===a.id||a.status==="Finalizado"} onClick={()=>update(a,"Confirmado")}>✓ Aceitar</button><button className="finish-booking" disabled={saving===a.id||a.status==="Finalizado"} onClick={()=>update(a,"Finalizado")}>★ Finalizar atendimento</button><button className="message-booking" onClick={()=>{setMessageFor(messageFor===a.id?null:a.id);setMessage(a.adminMessage||"")}}>✉ Mensagem</button><button className="cancel-booking" disabled={saving===a.id||a.status==="Finalizado"} onClick={()=>update(a,"Cancelado")}>× Cancelar</button></>}</div>{a.status==="Finalizado"&&<p className="commission-note">Pagamento: {a.paymentMethod||"—"} • Comissão: {a.commissionPercent}% ({money(a.commissionCents)})</p>}{messageFor===a.id&&<div className="appointment-message-form"><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Digite uma informação para o cliente..."/><button className="primary-button small" disabled={!message.trim()||saving===a.id} onClick={()=>update(a,a.status)}>Enviar mensagem</button></div>}</div>) : <p className="empty-table">Nenhum agendamento registrado.</p>}
      </div>
    </section>
  );
}
function PromotionManager({items,onRefresh}:any){
  const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);const [file,setFile]=useState<File|null>(null);const [form,setForm]=useState({title:"",description:"",validUntil:"",audience:"Todos"});const [message,setMessage]=useState("");
  const totalViews=items.reduce((sum:number,item:any)=>sum+Number(item.views||0),0);const totalClicks=items.reduce((sum:number,item:any)=>sum+Number(item.clicks||0),0);const active=items.filter((item:any)=>!item.validUntil||item.validUntil>=localDateKey()).length;
  async function save(){if(!form.title.trim()||!form.description.trim()||!file){setMessage("Preencha título, descrição e escolha o criativo.");return;}try{setSaving(true);const imageKey=await uploadImage(file);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"promotion",...form,imageKey})});if(!response.ok)throw new Error();setForm({title:"",description:"",validUntil:"",audience:"Todos"});setFile(null);setMessage("Promoção publicada com sucesso.");setOpen(false);await onRefresh();}catch{setMessage("Não foi possível publicar a promoção.");}finally{setSaving(false)}}
  return <section><div className="section-title"><div><small>DIVULGAÇÃO</small><h2>Promoções</h2><p className="section-description">Publique ofertas no carrossel da área do cliente e acompanhe o interesse gerado.</p></div><button className="primary-button small" onClick={()=>setOpen(!open)}>+ Nova promoção</button></div><div className="promotion-admin-metrics"><article><small>ATIVAS</small><strong>{active}</strong></article><article><small>VISUALIZAÇÕES</small><strong>{totalViews}</strong></article><article><small>CLIQUES NO WHATSAPP</small><strong>{totalClicks}</strong></article><article><small>TAXA DE INTERESSE</small><strong>{totalViews?`${Math.round(totalClicks/totalViews*100)}%`:"0%"}</strong></article></div>{open&&<div className="promotion-form"><label>Título<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex.: Presente no primeiro corte"/></label><label>Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explique a oferta e as condições"/></label><label>Válida até<input type="date" value={form.validUntil} onChange={e=>setForm({...form,validUntil:e.target.value})}/></label><label>Público<select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option value="Todos">Todos os clientes</option><option value="Assinantes">Somente assinantes</option></select></label><label>Foto do criativo<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="primary-button small" disabled={saving} onClick={save}>{saving?"Publicando...":"Publicar no carrossel"}</button></div>}{message&&<p className="form-message">{message}</p>}<Promotions items={items} track={false}/><div className="promotion-admin-list">{items.map((item:any)=><article key={item.id}>{item.imageKey&&<img src={storedImage(item.imageKey)} alt=""/>}<div><strong>{item.title}</strong><small>{item.audience==="Assinantes"?"Assinantes":"Todos"} • {item.validUntil?`até ${formatDate(item.validUntil)}`:"sem prazo"}</small></div><span>{item.views||0} visualizações<br/>{item.clicks||0} cliques</span></article>)}</div></section>;
}
function StyleCatalogManager({items,onRefresh}:any){
  const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);const [file,setFile]=useState<File|null>(null);const [message,setMessage]=useState("");const [form,setForm]=useState({name:"",category:"corte",description:""});
  async function save(){if(!form.name.trim()||!file){setMessage("Informe o nome e escolha uma foto.");return;}try{setSaving(true);const imageKey=await uploadImage(file);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"catalog-item",...form,imageKey})});if(!response.ok)throw new Error();setForm({name:"",category:"corte",description:""});setFile(null);setOpen(false);setMessage("Modelo adicionado ao catálogo.");await onRefresh();}catch{setMessage("Não foi possível salvar o modelo.");}finally{setSaving(false);}}
  return <section><div className="section-title"><div><small>GALERIA DE REFERÊNCIAS</small><h2>Catálogo de estilos e procedimentos</h2></div><button className="primary-button small" onClick={()=>setOpen(!open)}>+ Adicionar modelo</button></div>{open&&<div className="catalog-upload-form"><label>Nome<input list="chemical-suggestions" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Degradê baixo ou Progressiva"/><datalist id="chemical-suggestions"><option value="Progressiva"/><option value="Botox capilar"/><option value="Selagem"/><option value="Pigmentação"/><option value="Luzes"/><option value="Nevou"/></datalist></label><label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="corte">Corte</option><option value="barba">Barba</option><option value="quimica">Procedimento químico</option></select></label><label>Descrição<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Detalhes do estilo ou procedimento"/></label><label>Foto<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="primary-button small" disabled={saving} onClick={save}>{saving?"Enviando...":"Salvar no catálogo"}</button></div>}{message&&<p className="form-message">{message}</p>}<StyleCatalog items={items}/></section>;
}
function ServiceManager({items,onRefresh}:any){
  const empty={name:"",price:"",duration:"60",active:true};const [open,setOpen]=useState(false);const [editing,setEditing]=useState<any>(null);const [form,setForm]=useState<any>(empty);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  function add(){setEditing(null);setForm(empty);setOpen(true);setMessage("");}
  function edit(item:any){setEditing(item);setForm({name:item.name,price:(item.priceCents/100).toFixed(2),duration:String(item.durationMin),active:item.active!==false});setOpen(true);setMessage("");}
  async function send(payload:any){setSaving(true);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});setSaving(false);if(response.ok){setOpen(false);setMessage("Serviço salvo com sucesso.");await onRefresh();}else setMessage("Não foi possível salvar o serviço.");}
  function save(){if(!form.name.trim()||Number(form.price)<=0||Number(form.duration)<5){setMessage("Preencha nome, preço e duração válida.");return;}send({action:editing?"service-update":"service",id:editing?.id,...form});}
  function toggle(item:any){send({action:"service-update",id:item.id,name:item.name,price:item.priceCents/100,duration:item.durationMin,active:item.active===false});}
  return <section><div className="section-title"><div><small>CADASTRO</small><h2>Serviços</h2><p className="section-description">Altere nomes, preços, duração e disponibilidade.</p></div><button className="primary-button small" onClick={add}>+ Adicionar serviço</button></div>{open&&<div className="service-edit-form"><div className="form-head"><strong>{editing?"Editar serviço":"Novo serviço"}</strong><button onClick={()=>setOpen(false)}>×</button></div><label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Preço (R$)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Duração (minutos)<input type="number" min="5" step="5" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></label><label className="service-active"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Disponível para agendamento</label><button className="primary-button small" disabled={saving} onClick={save}>{saving?"Salvando...":"Salvar alterações"}</button></div>}{message&&<p className="form-message">{message}</p>}<div className="table-card"><table><thead><tr><th>Serviço</th><th>Preço</th><th>Duração</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{items.length?items.map((item:any)=><tr key={item.id}><td><strong>{item.name}</strong></td><td>{money(item.priceCents)}</td><td>{item.durationMin} minutos</td><td><span className={item.active===false?"pending":"status"}>{item.active===false?"Inativo":"Ativo"}</span></td><td><div className="row-actions"><button onClick={()=>edit(item)}>Editar</button><button onClick={()=>toggle(item)}>{item.active===false?"Ativar":"Desativar"}</button></div></td></tr>):<tr><td colSpan={5} className="empty-table">Nenhum serviço cadastrado.</td></tr>}</tbody></table></div></section>;
}
function CatalogManager({type,items,onRefresh}:any){
  const isService=type==="service";const [open,setOpen]=useState(false);const [file,setFile]=useState<File|null>(null);const [message,setMessage]=useState("");const [form,setForm]=useState({name:"",price:"",duration:"60",stock:"0",description:"",featured:false,showOnLogin:false});const [saving,setSaving]=useState(false);
  async function save(){if(!form.name.trim()||Number(form.price)<=0){setMessage("Preencha nome e preço.");return;}try{setSaving(true);const imageKey=!isService?await uploadImage(file):"";const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:type,...form,imageKey})});if(!response.ok)throw new Error();setOpen(false);setFile(null);setMessage("Cadastro salvo com sucesso.");setForm({name:"",price:"",duration:"60",stock:"0",description:"",featured:false,showOnLogin:false});await onRefresh();}catch{setMessage("Não foi possível salvar o cadastro.");}finally{setSaving(false);}}
  return <section><div className="section-title"><div><small>CADASTRO</small><h2>{isService?"Serviços":"Produtos e estoque"}</h2></div><button className="primary-button small" onClick={()=>setOpen(!open)}>+ Adicionar</button></div>{open&&<div className="catalog-form"><label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Preço (R$)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>{isService?<label>Duração (min)<input type="number" min="5" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></label>:<><label>Estoque<input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label>Descrição<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Foto<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label></>}<button className="primary-button small" disabled={saving} onClick={save}>{saving?"Salvando...":"Salvar cadastro"}</button></div>}{message&&<p className="form-message">{message}</p>}<div className="table-card"><table><thead><tr>{!isService&&<th>Foto</th>}<th>Nome</th>{isService?<th>Duração</th>:<th>Descrição</th>}<th>Preço</th>{!isService&&<th>Estoque</th>}<th>Status</th></tr></thead><tbody>{items.length?items.map((item:any)=><tr key={item.id}>{!isService&&<td>{item.imageKey?<img className="table-thumb" src={storedImage(item.imageKey)} alt=""/>:"—"}</td>}<td><strong>{item.name}</strong></td><td>{isService?`${item.durationMin} min`:item.description||"—"}</td><td>{money(item.priceCents)}</td>{!isService&&<td>{item.stock}</td>}<td>Ativo</td></tr>):<tr><td colSpan={isService?4:6} className="empty-table">Nenhum cadastro ainda.</td></tr>}</tbody></table></div></section>
}
function Cash({transactions,services,clients,onRefresh}:any) {
  const [showForm,setShowForm]=useState(false);
  const [showClientForm,setShowClientForm]=useState(false);
  const [clientForm,setClientForm]=useState({name:"",phone:"",email:"",birthDate:""});
  const [message,setMessage]=useState("");
  const [entry,setEntry]=useState({kind:"entrada",description:"",amount:"",date:new Date().toISOString().slice(0,10),clientEmail:"",clientName:"",serviceId:"",serviceName:""});
  const [saving,setSaving]=useState(false);
  const month=new Date().toISOString().slice(0,7);
  const monthRows=transactions.filter((t:any)=>t.date.startsWith(month));
  const entries=monthRows.filter((t:any)=>t.kind==="entrada").reduce((s:number,t:any)=>s+t.amountCents,0);
  const expenses=monthRows.filter((t:any)=>t.kind==="despesa").reduce((s:number,t:any)=>s+t.amountCents,0);
  const annual=transactions.filter((t:any)=>t.date.startsWith(new Date().getFullYear().toString())).reduce((s:number,t:any)=>s+(t.kind==="entrada"?t.amountCents:-t.amountCents),0);
  function selectService(id:string){const service=services.find((s:any)=>String(s.id)===id);setEntry({...entry,serviceId:id,serviceName:service?.name||"",description:service?.name||entry.description,amount:service?(service.priceCents/100).toFixed(2):entry.amount});}
  function selectClient(email:string){const client=clients.find((c:any)=>c.email===email);setEntry({...entry,clientEmail:email,clientName:client?.name||""});}
  async function createClient(){
    if(!clientForm.name.trim()||!clientForm.phone.trim()){setMessage("Informe pelo menos o nome e o telefone do cliente.");return;}
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"client-create",...clientForm})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){setMessage(response.status===401?"Sua sessão expirou. Entre novamente como administrador.":result.error||"Não foi possível cadastrar o cliente.");return;}
      setEntry({...entry,clientEmail:result.client.email,clientName:result.client.name});setClientForm({name:"",phone:"",email:"",birthDate:""});setShowClientForm(false);setMessage("Cliente cadastrado e vinculado ao lançamento.");await onRefresh();
    }catch{setMessage("Não foi possível conectar ao sistema. Verifique a conexão e tente novamente.");}
    finally{setSaving(false);}
  }
  async function save(){if(!entry.description.trim()||Number(entry.amount)<=0){setMessage("Informe a descrição e um valor maior que zero.");return;}setSaving(true);const r=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"transaction",...entry})});setSaving(false);if(r.ok){setEntry({...entry,description:"",amount:"",clientEmail:"",clientName:"",serviceId:"",serviceName:""});setShowForm(false);setMessage("Movimentação registrada com sucesso.");await onRefresh();}else setMessage("Não foi possível registrar a movimentação.");}
  return (
    <section>
      <div className="section-title">
        <div>
          <small>CAIXA</small>
          <h2>Movimentações do mês</h2>
        </div>
        <button className="primary-button small" onClick={()=>setShowForm(!showForm)}>+ Nova movimentação</button>
      </div>
      {showForm&&<><div className="cash-form"><label>Tipo<select value={entry.kind} onChange={e=>setEntry({...entry,kind:e.target.value})}><option value="entrada">Entrada</option><option value="despesa">Saída / Despesa</option></select></label>{entry.kind==="entrada"&&<><label>Cliente (opcional)<select value={entry.clientEmail} onChange={e=>selectClient(e.target.value)}><option value="">Sem cliente vinculado</option>{clients.map((c:any)=><option key={c.email} value={c.email}>{c.name} — {c.phone||c.email}</option>)}</select></label><button className="secondary-button cash-new-client" type="button" onClick={()=>setShowClientForm(!showClientForm)}>+ Cadastrar cliente</button><label>Serviço (opcional)<select value={entry.serviceId} onChange={e=>selectService(e.target.value)}><option value="">Sem serviço vinculado</option>{services.map((s:any)=><option key={s.id} value={s.id}>{s.name} — {money(s.priceCents)}</option>)}</select></label></>}<label>Descrição<input value={entry.description} onChange={e=>setEntry({...entry,description:e.target.value})} placeholder="Ex.: Corte, venda, água, energia ou aluguel"/></label><label>Valor (R$)<input type="number" min="0" step="0.01" value={entry.amount} onChange={e=>setEntry({...entry,amount:e.target.value})}/></label><label>Data<input type="date" value={entry.date} onChange={e=>setEntry({...entry,date:e.target.value})}/></label><button className="primary-button small" disabled={saving} onClick={save}>{saving?"Salvando...":"Registrar no caixa"}</button></div>{showClientForm&&<div className="cash-client-form"><div><strong>Novo cliente</strong><small>O cadastro será selecionado automaticamente neste lançamento.</small></div><label>Nome<input value={clientForm.name} onChange={e=>setClientForm({...clientForm,name:e.target.value})}/></label><label>Telefone / WhatsApp<input value={clientForm.phone} onChange={e=>setClientForm({...clientForm,phone:e.target.value})}/></label><label>E-mail (opcional)<input type="email" value={clientForm.email} onChange={e=>setClientForm({...clientForm,email:e.target.value})}/></label><label>Aniversário (opcional)<input type="date" value={clientForm.birthDate} onChange={e=>setClientForm({...clientForm,birthDate:e.target.value})}/></label><button className="primary-button small" disabled={saving} onClick={createClient}>{saving?"Salvando...":"Cadastrar e vincular"}</button></div>}</>}
      {message&&<p className="form-message">{message}</p>}
      <div className="metric-grid">
        <Metric
          label="Entradas"
          value={money(entries)}
          hint="Entradas do mês"
          tone="gold"
        />
        <Metric label="Saídas" value={money(expenses)} hint="Despesas do mês" />
        <Metric label="Saldo mensal" value={money(entries-expenses)} hint="Entradas - saídas" />
        <Metric label="Saldo anual" value={money(annual)} hint="Resultado do ano" />
      </div>
      <Registry
        title="Últimas movimentações"
        headers={["Data", "Cliente", "Serviço/Descrição", "Tipo", "Valor"]}
        rows={transactions.slice(0,30).map((t:any)=>[formatDate(t.date),t.clientName||"Não vinculado",t.serviceName||t.description,t.kind==="entrada"?"Entrada":"Saída",`${t.kind==="despesa"?"- ":""}${money(t.amountCents)}`])}
      />
    </section>
  );
}
function Registry({ title, headers, rows, showAdd = false }: any) {
  return (
    <section>
      <div className="section-title">
        <div>
          <small>CADASTRO</small>
          <h2>{title}</h2>
        </div>
        {showAdd && <button className="primary-button small">+ Adicionar</button>}
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              {headers.map((h: string) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: string[], i: number) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function money(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100)}
function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatDate(value:string|null){return value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "Sem atendimento"}
function ClientsDatabase({clients,onRefresh}:any){
  const [showQuick,setShowQuick]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [form,setForm]=useState({name:"",phone:""});
  const [candidates,setCandidates]=useState<any[]>([]);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [selected,setSelected]=useState<any>(null);
  const [editForm,setEditForm]=useState({name:"",phone:"",birthDate:""});
  const [loyaltyCount,setLoyaltyCount]=useState(0);
  const [loyaltyNote,setLoyaltyNote]=useState("");
  const contactPickerAvailable=typeof navigator!=="undefined"&&typeof (navigator as any).contacts?.select==="function";
  const cleanPhone=(value:string)=>value.replace(/[^\d+]/g,"").trim();
  function prepareContacts(rows:any[]){
    const unique=new Map<string,any>();
    rows.forEach((row:any)=>{const name=String(row.name||"").trim();const phone=cleanPhone(String(row.phone||""));if(name&&phone){const key=phone.replace(/\D/g,"");unique.set(key,{id:key,name,phone,selected:true});}});
    const list=[...unique.values()];setCandidates(list);setMessage(list.length?`${list.length} contato(s) pronto(s) para revisão.`:"Nenhum contato com nome e telefone foi encontrado.");setShowImport(true);
  }
  async function saveQuick(){
    if(!form.name.trim()||!form.phone.trim()){setMessage("Informe o nome e o telefone do cliente.");return;}
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"client-create",...form})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){setMessage(response.status===401?"Sua sessão expirou. Entre novamente como administrador.":result.error||"Não foi possível cadastrar o cliente.");return;}
      setForm({name:"",phone:""});setShowQuick(false);setMessage("Cliente cadastrado com sucesso.");await onRefresh();
    }catch{setMessage("Não foi possível conectar ao sistema. Verifique a conexão e tente novamente.");}
    finally{setSaving(false);}
  }
  async function pickPhoneContacts(){
    try{const picked=await (navigator as any).contacts.select(["name","tel"],{multiple:true});prepareContacts(picked.map((item:any)=>({name:item.name?.[0]||"",phone:item.tel?.[0]||""})));}
    catch(error:any){if(error?.name!=="AbortError")setMessage("O celular não liberou os contatos. Use a opção de arquivo abaixo.");}
  }
  async function readContactFile(file:File){
    const text=await file.text();let rows:any[]=[];
    if(/\.vcf$/i.test(file.name)||/BEGIN:VCARD/i.test(text)){
      rows=text.split(/END:VCARD/i).map(card=>({name:(card.match(/(?:^|\n)FN[^:]*:(.*)/i)?.[1]||"").trim(),phone:(card.match(/(?:^|\n)TEL[^:]*:(.*)/i)?.[1]||"").trim()}));
    }else{
      const lines=text.split(/\r?\n/).filter(Boolean);const separator=(lines[0]?.match(/;/g)||[]).length>(lines[0]?.match(/,/g)||[]).length?";":",";const headers=lines[0]?.split(separator).map(v=>v.trim().toLowerCase())||[];const nameIndex=headers.findIndex(h=>/nome|name/.test(h));const phoneIndex=headers.findIndex(h=>/telefone|celular|phone|tel|whatsapp/.test(h));const start=nameIndex>=0&&phoneIndex>=0?1:0;
      rows=lines.slice(start).map(line=>{const cells=line.split(separator).map(v=>v.replace(/^\s*["']|["']\s*$/g,"").trim());return {name:cells[nameIndex>=0?nameIndex:0]||"",phone:cells[phoneIndex>=0?phoneIndex:1]||""};});
    }
    prepareContacts(rows);
  }
  async function importSelected(){
    const selected=candidates.filter(item=>item.selected).map(({name,phone})=>({name,phone}));if(!selected.length){setMessage("Selecione pelo menos um contato para importar.");return;}setSaving(true);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"client-import",contacts:selected})});const result=await response.json().catch(()=>({}));setSaving(false);
    if(!response.ok){setMessage(result.error||"Não foi possível importar os contatos.");return;}setCandidates([]);setShowImport(false);setMessage(`${result.imported} cliente(s) importado(s) com sucesso.`);await onRefresh();
  }
  function openClient(client:any){setSelected(client);setEditForm({name:client.name||"",phone:client.phone||"",birthDate:client.birthDate||""});setLoyaltyCount(Number(client.loyaltyEligibleVisits||0));setLoyaltyNote("");setMessage("");}
  async function saveEdit(){if(!selected||!editForm.name.trim()||!editForm.phone.trim()){setMessage("Informe nome e telefone.");return;}setSaving(true);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"client-update",email:selected.email,...editForm})});const result=await response.json().catch(()=>({}));setSaving(false);if(!response.ok){setMessage(result.error||"Não foi possível atualizar o cliente.");return;}setMessage("Dados do cliente atualizados.");await onRefresh();}
  async function saveLoyalty(){if(!selected||!loyaltyNote.trim()||loyaltyCount<0){setMessage("Informe a quantidade e o motivo do ajuste.");return;}setSaving(true);const response=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"loyalty-adjust",email:selected.email,targetCount:loyaltyCount,note:loyaltyNote})});const result=await response.json().catch(()=>({}));setSaving(false);if(!response.ok){setMessage(result.error||"Não foi possível ajustar a fidelidade.");return;}setMessage("Cartão fidelidade atualizado.");setLoyaltyNote("");await onRefresh();}
  const currentSelected=selected&&clients.find((client:any)=>client.email===selected.email)||selected;
  return <section><div className="section-title"><div><small>BASE DE RELACIONAMENTO</small><h2>Clientes cadastrados</h2><p className="section-description">Cadastre, edite dados e acompanhe o cartão fidelidade de cada cliente.</p></div><div className="client-header-actions"><span className="client-count">{clients.length} clientes</span><button className="secondary-button" onClick={()=>{setShowImport(!showImport);setShowQuick(false);setMessage("")}}>Importar contatos</button><button className="primary-button small" onClick={()=>{setShowQuick(!showQuick);setShowImport(false);setMessage("")}}>+ Novo cliente</button></div></div>
    {showQuick&&<div className="client-quick-form"><div><strong>Cadastro rápido</strong><small>O cliente poderá completar os demais dados futuramente.</small></div><label>Nome<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nome do cliente"/></label><label>Telefone / WhatsApp<input inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(62) 99999-9999"/></label><button className="primary-button small" disabled={saving} onClick={saveQuick}>{saving?"Salvando...":"Cadastrar cliente"}</button></div>}
    {showImport&&<div className="contact-import-panel"><div className="contact-import-head"><div><strong>Importar contatos</strong><small>Escolha os contatos no celular ou carregue um arquivo CSV/VCF. Nada será salvo antes da sua confirmação.</small></div><div>{contactPickerAvailable&&<button className="primary-button small" onClick={pickPhoneContacts}>Selecionar do celular</button>}<label className="secondary-button file-button">Carregar arquivo<input type="file" accept=".csv,.txt,.vcf,text/csv,text/vcard" onChange={e=>e.target.files?.[0]&&readContactFile(e.target.files[0])}/></label></div></div>{!contactPickerAvailable&&<p className="import-tip">Neste navegador, use um arquivo exportado dos contatos. Em celulares Android compatíveis, a seleção direta também aparece.</p>}{candidates.length>0&&<><div className="contact-review"><div className="contact-review-title"><strong>Revise antes de importar</strong><button onClick={()=>setCandidates(candidates.map(item=>({...item,selected:true})))}>Selecionar todos</button></div>{candidates.map((item,index)=><label key={item.id||index}><input type="checkbox" checked={item.selected} onChange={e=>setCandidates(candidates.map((current,i)=>i===index?{...current,selected:e.target.checked}:current))}/><span><b>{item.name}</b><small>{item.phone}</small></span></label>)}</div><button className="primary-button small import-confirm" disabled={saving} onClick={importSelected}>{saving?"Importando...":`Importar ${candidates.filter(item=>item.selected).length} selecionado(s)`}</button></>}</div>}
    {message&&<p className="form-message" role="status">{message}</p>}
    {currentSelected&&<div className="client-detail-panel"><div className="client-detail-head"><div><small>FICHA DO CLIENTE</small><h3>{currentSelected.name}</h3><span>{currentSelected.email}</span></div><button className="secondary-button" onClick={()=>setSelected(null)}>Fechar ficha</button></div><div className="client-detail-grid"><div className="panel"><h3>Editar dados</h3><label>Nome<input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></label><label>Telefone<input inputMode="tel" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/></label><label>Aniversário<input type="date" value={editForm.birthDate} onChange={e=>setEditForm({...editForm,birthDate:e.target.value})}/></label><button className="primary-button small" disabled={saving} onClick={saveEdit}>{saving?"Salvando...":"Salvar dados"}</button></div><div className="panel loyalty-admin-card"><small>CARTÃO FIDELIDADE</small><h3>{currentSelected.loyaltyRewardAvailable?"🎉 Benefício disponível":"Progresso do cliente"}</h3><strong>{currentSelected.loyaltyProgress} de {currentSelected.loyaltyTarget||8} atendimentos</strong><div className="loyalty-progress"><span style={{width:`${Math.min(100,(currentSelected.loyaltyProgress/(currentSelected.loyaltyTarget||8))*100)}%`}}/></div><p>{currentSelected.loyaltyRewardAvailable?"Use a forma de pagamento Cortesia ao finalizar o próximo atendimento.":`Faltam ${Math.max(0,(currentSelected.loyaltyTarget||8)-currentSelected.loyaltyProgress)} atendimento(s) para liberar o próximo gratuito.`}</p><label>Corrigir total de atendimentos<input type="number" min="0" step="1" value={loyaltyCount} onChange={e=>setLoyaltyCount(Math.max(0,Number(e.target.value)||0))}/></label><label>Motivo do ajuste<input value={loyaltyNote} onChange={e=>setLoyaltyNote(e.target.value)} placeholder="Ex.: conferência da agenda antiga"/></label><button className="primary-button small" disabled={saving||!loyaltyNote.trim()} onClick={saveLoyalty}>{saving?"Salvando...":"Salvar ajuste"}</button><small className="form-hint">O 9º atendimento é gratuito. Para usar o benefício, finalize o agendamento na Agenda com pagamento “Cortesia”.</small></div></div><div className="client-detail-stats"><span>Atendimentos realizados<b>{currentSelected.appointmentsCount}</b></span><span>Atendimentos pagos<b>{currentSelected.loyaltyEligibleVisits}</b></span><span>Benefícios usados<b>{currentSelected.loyaltyRewardsRedeemed||0}</b></span><span>Total pago<b>{money(currentSelected.totalSpentCents)}</b></span></div></div>}
    <div className="table-card"><table><thead><tr><th>Cliente</th><th>Assinatura</th><th>Telefone</th><th>Aniversário</th><th>Último atendimento</th><th>Serviço</th><th>Atendimentos</th><th>Total</th><th>Ação</th></tr></thead><tbody>{clients.length ? clients.map((c:any)=><tr key={c.email}><td><strong>{c.name}</strong>{!c.email.endsWith("@cadastro.local")&&<small className="cell-email">{c.email}</small>}</td><td><span className={`client-subscription-badge ${c.subscriptionStatus.toLowerCase().replaceAll(" ","-")}`}>{c.subscriptionStatus==="Sem assinatura"?"Cliente avulso":`♛ ${c.subscriptionStatus}`}</span>{c.subscriptionEndDate&&<small className="subscription-expiry">até {formatDate(c.subscriptionEndDate)}</small>}</td><td>{c.phone||"Não informado"}</td><td>{formatDate(c.birthDate)}</td><td>{formatDate(c.lastVisit)}</td><td>{c.lastService||"—"}</td><td>{c.appointmentsCount}</td><td>{money(c.totalSpentCents)}</td><td><button className="secondary-button small" onClick={()=>openClient(c)}>Abrir ficha</button></td></tr>) : <tr><td colSpan={9} className="empty-table">Os clientes cadastrados aparecerão aqui.</td></tr>}</tbody></table></div>
  </section>
}
function Remarketing({clients,initialContacts}:any){
  const [tab,setTab]=useState("pos");
  const [inactiveDays,setInactiveDays]=useState(15);
  const [serviceFilter,setServiceFilter]=useState("todos");
  const [contacts,setContacts]=useState<Record<string,{sentAt:string;answered?:boolean;returned?:boolean}>>(()=>Object.fromEntries((initialContacts||[]).map((item:any)=>[item.key,item])));
  useEffect(()=>setContacts(Object.fromEntries((initialContacts||[]).map((item:any)=>[item.key,item]))),[initialContacts]);
  function updateContact(key:string,clientEmail:string,change:any){setContacts(current=>{const contact={...(current[key]||{}),...change};fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"marketing-contact",key,clientEmail,campaign:tab,...contact})});return {...current,[key]:contact}})}
  const completed=clients.filter((c:any)=>c.lastVisit&&c.lastStatus==="Finalizado");
  const inactive=clients.filter((c:any)=>c.daysSinceLastVisit!==null&&c.daysSinceLastVisit>=inactiveDays&&(serviceFilter==="todos"||c.lastService===serviceFilter));
  const currentMonth=String(new Date().getMonth()+1).padStart(2,"0");
  const birthdays=clients.filter((c:any)=>c.birthDate?.slice(5,7)===currentMonth);
  const loyalty=clients.filter((c:any)=>Number(c.loyaltyProgress||0)>=6);
  const membership=clients.filter((c:any)=>c.finalizedCount>=3&&c.subscriptionStatus==="Sem assinatura");
  const services=[...new Set(clients.map((c:any)=>c.lastService).filter(Boolean))] as string[];
  const sentCount=Object.values(contacts).filter((item:any)=>item.sentAt).length;
  const answeredCount=Object.values(contacts).filter((item:any)=>item.answered).length;
  const returnedCount=Object.values(contacts).filter((item:any)=>item.returned).length;
  const whatsapp=(c:any,text:string)=>{const phone=(c.phone||"").replace(/\D/g,"");return `https://wa.me/${phone.startsWith("55")?phone:`55${phone}`}?text=${encodeURIComponent(text)}`};
  const postMessage=(c:any)=>`Olá, ${c.name.split(" ")[0]}! Tudo bem? ✂️\n\nObrigado por escolher a Yuri Barbershop! Como foi seu atendimento de ${c.lastService||"hoje"}? Sua opinião é muito importante para nós.\n\n⭐ Avalie a Yuri Barbershop no Google:\nhttps://g.page/r/CaO2Z7is9bPgEAE/review\n\n📲 Siga nosso Instagram:\nhttps://www.instagram.com/yuricbarbearia\n\n📸 Se você tirou uma foto do resultado, poste nos Stories e marque @yuricbarbearia. Vamos adorar compartilhar!\n\nObrigado pela confiança!`;
  const returnMessage=(c:any)=>`Olá, ${c.name.split(" ")[0]}! Tudo bem? Já faz ${c.daysSinceLastVisit} dias desde seu último atendimento na Yuri Barbershop. Que tal cuidarmos do visual novamente? Fale comigo por aqui para combinarmos seu próximo horário. ✂️`;
  const birthdayMessage=(c:any)=>`Olá, ${c.name.split(" ")[0]}! O seu mês chegou! 🎉 A Yuri Barbershop deseja um feliz aniversário. Você tem um presente especial esperando por você. Fale comigo para agendar!`;
  const referralMessage=(c:any)=>`Olá, ${c.name.split(" ")[0]}! Que tal indicar um amigo para conhecer a Yuri Barbershop? Quando ele fizer o primeiro atendimento, vocês recebem um benefício especial. Envie nosso contato para ele! ✂️`;
  const loyaltyMessage=(c:any)=>c.loyaltyRewardAvailable?`Olá, ${c.name.split(" ")[0]}! Seu cartão fidelidade está completo e você já tem um atendimento gratuito disponível. Vamos agendar? ⭐`:`Olá, ${c.name.split(" ")[0]}! Você está quase completando seu cartão fidelidade: faltam apenas ${Math.max(0, Number(c.loyaltyTarget||8)-Number(c.loyaltyProgress||0))} atendimento(s) para ganhar 1 serviço grátis. Vamos agendar o próximo? ⭐`;
  const membershipMessage=(c:any)=>`Olá, ${c.name.split(" ")[0]}! Como você cuida sempre do visual, o Clube Yuri pode ser ideal: serviços ilimitados por R$ 120 durante 30 dias. Quer conhecer as condições? 👑`;
  const lists:any={pos:{title:"Solicitar avaliação e marcação",items:completed,message:postMessage,badge:"Pós-atendimento"},retorno:{title:"Clientes para voltar",items:inactive,message:returnMessage,badge:`${inactiveDays}+ dias`},aniversario:{title:"Aniversariantes do mês",items:birthdays,message:birthdayMessage,badge:"Presente de aniversário"},indicacao:{title:"Campanha indique um amigo",items:clients,message:referralMessage,badge:"Indicação"},fidelidade:{title:"Próximos do prêmio",items:loyalty,message:loyaltyMessage,badge:"Fidelidade"},assinatura:{title:"Potenciais assinantes",items:membership,message:membershipMessage,badge:"Clube Yuri"}};
  const selected=lists[tab];
  return <section><div className="section-title"><div><small>RELACIONAMENTO</small><h2>Central de remarketing</h2><p className="section-description">Campanhas prontas, segmentação e acompanhamento dos resultados.</p></div></div>
    <div className="remarketing-brevo-card"><div><small>ENVIO DE E-MAILS PROMOCIONAIS</small><strong>Campanhas pelo Brevo</strong><p>Crie, segmente, teste e agende seus e-mails promocionais usando o remetente oficial da Yuri Barbershop.</p></div><a href="https://app.brevo.com/campaign/list" target="_blank" rel="noreferrer noopener">Abrir campanhas no Brevo ↗</a></div>
    <div className="remarketing-metrics"><article><small>Mensagens abertas</small><strong>{sentCount}</strong></article><article><small>Respostas registradas</small><strong>{answeredCount}</strong></article><article><small>Clientes que voltaram</small><strong>{returnedCount}</strong></article><article><small>Conversão</small><strong>{sentCount?Math.round(returnedCount/sentCount*100):0}%</strong></article></div>
    <div className="remarketing-tabs"><button className={tab==="pos"?"active":""} onClick={()=>setTab("pos")}>Pós-atendimento</button><button className={tab==="retorno"?"active":""} onClick={()=>setTab("retorno")}>15/30/60/90 dias</button><button className={tab==="aniversario"?"active":""} onClick={()=>setTab("aniversario")}>Aniversariantes</button><button className={tab==="indicacao"?"active":""} onClick={()=>setTab("indicacao")}>Indique um amigo</button><button className={tab==="fidelidade"?"active":""} onClick={()=>setTab("fidelidade")}>Fidelidade</button><button className={tab==="assinatura"?"active":""} onClick={()=>setTab("assinatura")}>Assinatura</button></div>
    {tab==="retorno"&&<div className="remarketing-filters"><label>Tempo sem atendimento<select value={inactiveDays} onChange={e=>setInactiveDays(Number(e.target.value))}><option value={15}>15 dias ou mais</option><option value={30}>30 dias ou mais</option><option value={60}>60 dias ou mais</option><option value={90}>90 dias ou mais</option></select></label><label>Último serviço<select value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)}><option value="todos">Todos os serviços</option>{services.map(service=><option key={service}>{service}</option>)}</select></label></div>}
    <div className="relationship-block"><div className="relationship-heading"><div><small>CAMPANHA ATIVA</small><h3>{selected.title}</h3></div><span className="remarketing-count">{selected.items.length} clientes</span></div><div className="remarketing-list">{selected.items.length?selected.items.map((c:any)=>{const key=`${tab}-${c.email}-${c.lastVisit||"novo"}`;const contact=contacts[key];return <article className={`remarketing-card ${contact?.sentAt?"contacted":""}`} key={key}><div className="avatar">{c.name[0]}</div><div className="remarketing-info"><strong>{c.name}</strong><span>{c.lastVisit?`Último atendimento: ${formatDate(c.lastVisit)} • ${c.lastService}`:c.phone||c.email}</span><small>{contact?.sentAt?`Contatado em ${new Date(contact.sentAt).toLocaleDateString("pt-BR")}`:selected.badge}</small></div><div className="remarketing-actions">{c.phone?<a href={whatsapp(c,selected.message(c))} onClick={()=>updateContact(key,c.email,{sentAt:new Date().toISOString()})} target="_blank" rel="noreferrer">Enviar WhatsApp</a>:<em>Sem telefone</em>}{contact?.sentAt&&<><button className={contact.answered?"active":""} onClick={()=>updateContact(key,c.email,{answered:!contact.answered})}>✓ Respondeu</button><button className={contact.returned?"active":""} onClick={()=>updateContact(key,c.email,{returned:!contact.returned})}>↻ Retornou</button></>}</div></article>}):<div className="empty-remarketing"><b>✓</b><h3>Nenhum cliente nesta campanha</h3><p>Os clientes aparecerão automaticamente quando atenderem aos critérios.</p></div>}</div></div>
  </section>
}
function Reports({transactions,appointments,clients,services,onRefresh}:any) {
  const currentYear=new Date().getFullYear();
  const [year,setYear]=useState(currentYear);
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [showHistory,setShowHistory]=useState(false);
  const [launchMode,setLaunchMode]=useState<"day"|"month">("day");
  const [launchDate,setLaunchDate]=useState(localDateKey());
  const [historical,setHistorical]=useState({revenue:"",expenses:"",note:""});
  const [saving,setSaving]=useState(false);
  const [launchStatus,setLaunchStatus]=useState("");
  const names=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const initialService=services.find((service:any)=>service.active!==false&&service.name.toLowerCase().includes("corte"))||services.find((service:any)=>service.active!==false)||services[0];
  const [referenceServiceId,setReferenceServiceId]=useState(initialService?String(initialService.id):"");
  const referenceService=services.find((service:any)=>String(service.id)===referenceServiceId)||initialService;
  const referencePriceCents=Math.max(1,referenceService?.priceCents||3000);
  const prefix=`${year}-${String(month).padStart(2,"0")}`;
  const yearRows=transactions.filter((t:any)=>t.date.startsWith(String(year)));
  const monthRows=yearRows.filter((t:any)=>t.date.startsWith(prefix));
  const total=(rows:any[])=>rows.reduce((sum:number,t:any)=>sum+(t.kind==="entrada"?t.amountCents:-t.amountCents),0);
  const entries=monthRows.filter((t:any)=>t.kind==="entrada").reduce((sum:number,t:any)=>sum+t.amountCents,0);
  const expenses=monthRows.filter((t:any)=>t.kind==="despesa").reduce((sum:number,t:any)=>sum+t.amountCents,0);
  const monthlySummaries=Array.from({length:12},(_,i)=>{
    const monthPrefix=`${year}-${String(i+1).padStart(2,"0")}`;
    const rows=yearRows.filter((t:any)=>t.date.startsWith(monthPrefix));
    const monthEntries=rows.filter((t:any)=>t.kind==="entrada").reduce((sum:number,t:any)=>sum+t.amountCents,0);
    const monthExpenses=rows.filter((t:any)=>t.kind==="despesa").reduce((sum:number,t:any)=>sum+t.amountCents,0);
    const registeredVisits=appointments.filter((a:any)=>a.date?.startsWith(monthPrefix)&&a.status!=="Cancelado").length;
    return {index:i+1,name:names[i],entries:monthEntries,expenses:monthExpenses,balance:monthEntries-monthExpenses,registeredVisits,estimatedVisits:Math.round(monthEntries/referencePriceCents)};
  });
  const maxRevenue=Math.max(1,...monthlySummaries.map(item=>item.entries));
  const selectedSummary=monthlySummaries[month-1];
  async function saveHistory(){
    const revenue=Number(historical.revenue),expense=Number(historical.expenses);
    if(revenue<=0&&expense<=0){setLaunchStatus("Informe um valor de faturamento ou despesa.");return;}
    if(launchMode==="day"&&!/^\d{4}-\d{2}-\d{2}$/.test(launchDate)){setLaunchStatus("Escolha uma data válida.");return;}
    setSaving(true);
    setLaunchStatus("");
    const date=launchMode==="day"?launchDate:`${year}-${String(month).padStart(2,"0")}-01`;
    const launchLabel=launchMode==="day"?formatDate(date):`${names[month-1]}/${year}`;
    const requests=[];
    if(revenue>0)requests.push(fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"transaction",kind:"entrada",description:historical.note||`Faturamento ${launchMode==="day"?"do dia":"consolidado"} — ${launchLabel}`,amount:revenue,date})}));
    if(expense>0)requests.push(fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"transaction",kind:"despesa",description:historical.note?`Despesas — ${historical.note}`:`Despesas ${launchMode==="day"?"do dia":"consolidadas"} — ${launchLabel}`,amount:expense,date})}));
    const responses=await Promise.all(requests);
    setSaving(false);
    if(responses.some(response=>!response.ok)){setLaunchStatus("Não foi possível salvar todos os valores. Tente novamente.");return;}
    if(launchMode==="day"){setYear(Number(date.slice(0,4)));setMonth(Number(date.slice(5,7)));}
    setHistorical({revenue:"",expenses:"",note:""});setLaunchStatus(`Dados de ${launchLabel} salvos com sucesso.`);await onRefresh();
  }
  return <section>
    <div className="section-title"><div><small>RELATÓRIOS</small><h2>Relatórios financeiros</h2></div><div className="report-actions"><div className="report-filters"><label>Mês<select value={month} onChange={e=>setMonth(Number(e.target.value))}>{names.map((name,i)=><option key={name} value={i+1}>{name}</option>)}</select></label><label>Ano<select value={year} onChange={e=>setYear(Number(e.target.value))}>{[currentYear-5,currentYear-4,currentYear-3,currentYear-2,currentYear-1,currentYear,currentYear+1].map(y=><option key={y}>{y}</option>)}</select></label></div><button className="primary-button small" onClick={()=>{setShowHistory(!showHistory);setLaunchStatus("")}}>+ Lançar dados</button></div></div>
    {showHistory&&<><div className="history-entry"><div><small>LANÇAMENTO FINANCEIRO</small><h3>{launchMode==="day"?`Dia ${formatDate(launchDate)}`:`${names[month-1]} de ${year}`}</h3><p>Escolha um dia específico ou registre o fechamento completo do mês.</p></div><label>Período<select value={launchMode} onChange={e=>setLaunchMode(e.target.value as "day"|"month")}><option value="day">Dia específico</option><option value="month">Mês fechado</option></select></label>{launchMode==="day"&&<label>Data<input type="date" value={launchDate} max={localDateKey()} onChange={e=>setLaunchDate(e.target.value)}/></label>}<label>Faturamento (R$)<input type="number" min="0" step="0.01" value={historical.revenue} onChange={e=>setHistorical({...historical,revenue:e.target.value})} placeholder="0,00"/></label><label>Despesas (R$)<input type="number" min="0" step="0.01" value={historical.expenses} onChange={e=>setHistorical({...historical,expenses:e.target.value})} placeholder="0,00"/></label><label>Observação<input value={historical.note} onChange={e=>setHistorical({...historical,note:e.target.value})} placeholder={launchMode==="day"?"Ex.: movimento do dia":"Ex.: fechamento do mês"}/></label><button className="primary-button small" disabled={saving} onClick={saveHistory}>{saving?"Salvando...":launchMode==="day"?"Salvar dia":"Salvar mês"}</button></div>{launchStatus&&<p className="form-message" role="status">{launchStatus}</p>}</>}
    <div className="report-estimator panel"><div><small>ATENDIMENTOS DO ANO</small><h3>Resumo por serviço</h3></div><label>Serviço de referência<select value={referenceServiceId} onChange={e=>setReferenceServiceId(e.target.value)}>{services.filter((service:any)=>service.active!==false).map((service:any)=><option key={service.id} value={service.id}>{service.name} — {money(service.priceCents)}</option>)}{!services.length&&<option value="">Corte — R$ 30,00</option>}</select></label></div>
    <div className="metric-grid"><Metric label="Faturamento do mês" value={money(entries)} hint={`${selectedSummary.registeredVisits} agendamentos registrados`} tone="gold"/><Metric label="Atendimentos estimados" value={String(selectedSummary.estimatedVisits)} hint={`Faturamento ÷ ${money(referencePriceCents)}`}/><Metric label="Despesas do mês" value={money(expenses)} hint="Saídas registradas"/><Metric label="Saldo mensal" value={money(entries-expenses)} hint={`${names[month-1]} de ${year}`}/></div>
    <div className="panel report-bars"><div className="report-chart-head"><div><small>FATURAMENTO ANUAL</small><h3>Faturamento por mês — {year}</h3></div><div><strong>{money(monthlySummaries.reduce((sum,item)=>sum+item.entries,0))}</strong><span>Saldo anual: {money(total(yearRows))}</span></div></div><p className="chart-help">Os valores aparecem acima das barras. Clique em um mês para ver seus lançamentos.</p><div className="monthly-bars">{monthlySummaries.map(item=><button type="button" className={month===item.index?"selected":""} key={item.index} onClick={()=>setMonth(item.index)} aria-label={`${item.name}: faturamento ${money(item.entries)}, estimativa de ${item.estimatedVisits} atendimentos`}><b>{item.entries?money(item.entries):"R$ 0"}</b><span style={{height:`${Math.max(3,item.entries/maxRevenue*100)}%`}}/><small>{item.name}</small></button>)}</div></div>
    <div className="table-card annual-summary-table"><table><thead><tr><th>Mês</th><th>Faturamento</th><th>Despesas</th><th>Saldo</th><th>Agendamentos</th><th>Atendimentos estimados</th></tr></thead><tbody>{monthlySummaries.map(item=><tr className={month===item.index?"selected-month":""} key={item.index} onClick={()=>setMonth(item.index)}><td><strong>{item.name}/{year}</strong></td><td>{money(item.entries)}</td><td>{money(item.expenses)}</td><td className={item.balance<0?"negative-value":""}>{money(item.balance)}</td><td>{item.registeredVisits}</td><td><strong>{item.estimatedVisits}</strong><small className="estimation-note"> com base em {referenceService?.name||"Corte"}</small></td></tr>)}</tbody></table></div>
    <div className="table-card report-table"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>{monthRows.length?monthRows.map((t:any)=><tr key={t.id}><td>{formatDate(t.date)}</td><td>{t.description}</td><td>{t.kind==="entrada"?"Entrada":"Saída"}</td><td>{t.kind==="despesa"?"- ":""}{money(t.amountCents)}</td></tr>):<tr><td colSpan={4} className="empty-table">Nenhum lançamento neste mês.</td></tr>}</tbody></table></div>
  </section>;
}
