"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Service = { id:number; name:string; priceCents:number; durationMin:number };
type Collaborator = { id:number; name:string; active:boolean };
type Product = { id:number; name:string; description?:string; priceCents:number; stock:number; imageKey?:string; featured?:boolean };
type CatalogItem = { id:number|string; name:string; category:string; description?:string; imageKey?:string };
type Promotion = { id:number|string; title:string; description?:string; validUntil?:string|null };
type Subscription = { id:number; status:string; startDate?:string; endDate?:string };
type Appointment = { id:number; date:string; time:string; serviceName:string; status:string };
type Data = {
  services: Service[];
  products: Product[];
  catalogItems: CatalogItem[];
  promotions: Promotion[];
  subscriptions: Subscription[];
  appointments: Appointment[];
  settings: { loyaltyTarget?:number; loyaltyReward?:string };
  collaborators: Collaborator[];
  profiles: Array<{ name:string; phone?:string; birthDate?:string }>;
};
type Journey = "service" | "product" | "combo" | "";
type Screen = "entry" | "catalog" | "service" | "mode" | "datetime" | "products" | "summary";
type ServiceSource = "picker" | "direct" | "catalog" | "";

function localDateKey(date = new Date()) {
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function price(cents:number){
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(cents)||0)/100);
}

function storedImage(key?:string){
  return key ? `/api/upload?key=${encodeURIComponent(key)}` : "";
}

function normalize(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}

function openClientSection(label:string){
  const wanted=normalize(label);
  const button=Array.from(document.querySelectorAll<HTMLButtonElement>(".sidebar nav button"))
    .find(item=>normalize(item.textContent||"").includes(wanted));
  if(!button)return false;
  button.click();
  window.setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),40);
  return true;
}

function slotsFor(date:string,durationMin:number){
  if(!date)return [];
  const day=new Date(`${date}T12:00:00`).getDay();
  const start=day===0||day===6?8*60:18*60;
  const end=day===0?12*60:20*60+30;
  const now=new Date();
  const today=localDateKey(now);
  const nowMinutes=now.getHours()*60+now.getMinutes();
  const result:string[]=[];
  for(let min=start;min+Math.max(5,durationMin)<=end;min+=30){
    if(date===today && min<=nowMinutes)continue;
    result.push(`${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`);
  }
  return result;
}

function flowFor(journey:Journey,source:ServiceSource):Screen[]{
  if(journey==="product") return ["entry","products","summary"];
  if(journey==="service"||journey==="combo"){
    if(source==="direct"||source==="catalog") return ["entry","mode","datetime","products","summary"];
    return ["entry","service","mode","datetime","products","summary"];
  }
  return ["entry"];
}

export default function MobileBookingBridge(){
  const [target,setTarget]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    const sync=()=>setTarget(document.querySelector(".booking-with-ads") as HTMLElement|null);
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    if(!target)return;
    const sidebar=document.querySelector(".sidebar") as HTMLElement|null;
    if(!sidebar)return;

    let returnButton=sidebar.querySelector(".mobile-return-booking") as HTMLButtonElement|null;
    if(!returnButton){
      returnButton=document.createElement("button");
      returnButton.type="button";
      returnButton.className="mobile-return-booking";
      returnButton.innerHTML="<span>←</span><strong>Voltar à Central</strong>";
      returnButton.addEventListener("click",()=>{
        const menuButton=document.querySelector(".menu-button") as HTMLButtonElement|null;
        if(sidebar.classList.contains("open")) menuButton?.click();
      });
      const nav=sidebar.querySelector("nav");
      sidebar.insertBefore(returnButton,nav || sidebar.firstChild);
    }

    return()=>{ sidebar.querySelector(".mobile-return-booking")?.remove(); };
  },[target]);

  if(!target)return null;
  return createPortal(<BookingCommerce/>,target);
}

function BookingCommerce(){
  const [data,setData]=useState<Data>({services:[],products:[],catalogItems:[],promotions:[],subscriptions:[],appointments:[],settings:{},collaborators:[],profiles:[]});
  const [loading,setLoading]=useState(true);
  const [journey,setJourney]=useState<Journey>("");
  const [screen,setScreen]=useState<Screen>("entry");
  const [serviceSource,setServiceSource]=useState<ServiceSource>("");
  const [serviceId,setServiceId]=useState(0);
  const [selectedStyle,setSelectedStyle]=useState<CatalogItem|null>(null);
  const [collaboratorId,setCollaboratorId]=useState(0);
  const [mode,setMode]=useState<"schedule"|"notice">("schedule");
  const [date,setDate]=useState("");
  const [time,setTime]=useState("");
  const [cart,setCart]=useState<Record<number,number>>({});
  const [occupiedTimes,setOccupiedTimes]=useState<string[]>([]);
  const [availabilityLoading,setAvailabilityLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/data",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then((json)=>{
      setData({
        services:Array.isArray(json.services)?json.services:[],
        products:Array.isArray(json.products)?json.products:[],
        catalogItems:Array.isArray(json.catalogItems)?json.catalogItems:[],
        promotions:Array.isArray(json.promotions)?json.promotions:[],
        subscriptions:Array.isArray(json.subscriptions)?json.subscriptions:[],
        appointments:Array.isArray(json.appointments)?json.appointments:[],
        settings:json.settings||{},
        collaborators:Array.isArray(json.collaborators)?json.collaborators:[],
        profiles:Array.isArray(json.profiles)?json.profiles:[],
      });
      const active=(json.collaborators||[]).filter((c:Collaborator)=>c.active);
      if(active.length===1)setCollaboratorId(active[0].id);
    }).catch(()=>setError("Não foi possível carregar a Central agora.")).finally(()=>setLoading(false));
  },[]);

  const service=useMemo(()=>data.services.find(s=>s.id===serviceId),[data.services,serviceId]);
  const collaborators=(data.collaborators||[]).filter(c=>c.active);
  const profile=data.profiles?.[0];
  const selectedCollaborator=collaborators.find(c=>c.id===collaboratorId);
  const availableProducts=useMemo(()=>data.products.filter(p=>Number(p.stock)>0),[data.products]);
  const cutCatalog=useMemo(()=>{
    const cuts=data.catalogItems.filter(item=>normalize(item.category||"").includes("corte"));
    return cuts.length?cuts:data.catalogItems.filter(item=>/corte|fade|degrade|social/i.test(item.name));
  },[data.catalogItems]);
  const validDate=Boolean(date&&date>=localDateKey());
  const rawTimes=slotsFor(date,service?.durationMin||30);
  const times=rawTimes.filter(slot=>!occupiedTimes.includes(slot));
  const flow=flowFor(journey,serviceSource);
  const stepIndex=Math.max(0,flow.indexOf(screen));
  const cartItems=useMemo(()=>availableProducts.map(product=>({product,quantity:cart[product.id]||0})).filter(item=>item.quantity>0),[availableProducts,cart]);
  const productTotal=cartItems.reduce((sum,item)=>sum+item.product.priceCents*item.quantity,0);
  const serviceTotal=journey==="product"?0:(service?.priceCents||0);
  const total=serviceTotal+productTotal;
  const readyForSummary=journey==="product"
    ? cartItems.length>0
    : Boolean(service&&validDate&&(mode==="notice"||time)&&(journey!=="combo"||cartItems.length>0));

  const today=localDateKey();
  const upcoming=useMemo(()=>data.appointments
    .filter(item=>item.status!=="Cancelado"&&item.date>=today)
    .sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]||null,[data.appointments,today]);
  const activeSubscription=useMemo(()=>data.subscriptions.find(item=>item.status==="Ativa"&&(!item.endDate||item.endDate>=today))||null,[data.subscriptions,today]);
  const finalizedCount=data.appointments.filter(item=>item.status==="Finalizado").length;
  const loyaltyTarget=Math.max(1,Number(data.settings?.loyaltyTarget||10));
  const loyaltyProgress=finalizedCount===0?0:((finalizedCount-1)%loyaltyTarget)+1;
  const loyaltyComplete=finalizedCount>0&&loyaltyProgress===loyaltyTarget;

  useEffect(()=>{
    if(!date||!serviceId||mode!=="schedule"){
      setOccupiedTimes([]);
      return;
    }
    const controller=new AbortController();
    setAvailabilityLoading(true);
    fetch(`/api/data?date=${encodeURIComponent(date)}&serviceId=${serviceId}`,{cache:"no-store",signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(json=>setOccupiedTimes(Array.isArray(json.occupiedTimes)?json.occupiedTimes:[]))
      .catch(()=>{if(!controller.signal.aborted)setOccupiedTimes([]);})
      .finally(()=>{if(!controller.signal.aborted)setAvailabilityLoading(false);});
    return()=>controller.abort();
  },[date,serviceId,mode]);

  useEffect(()=>{if(date&&date<localDateKey()){setDate("");setTime("");}},[date]);
  useEffect(()=>{if(time&&!times.includes(time))setTime("");},[date,serviceId,occupiedTimes]);

  function resetOrder(){
    setJourney("");
    setScreen("entry");
    setServiceSource("");
    setServiceId(0);
    setSelectedStyle(null);
    setMode("schedule");
    setDate("");
    setTime("");
    setCart({});
    setOccupiedTimes([]);
    setError("");
  }

  function chooseJourney(next:Exclude<Journey,"">){
    setJourney(next);
    setServiceSource(next==="product"?"":"picker");
    setServiceId(0);
    setSelectedStyle(null);
    setMode("schedule");
    setDate("");
    setTime("");
    setCart({});
    setScreen(next==="product"?"products":"service");
  }

  function chooseService(id:number,source:ServiceSource="picker"){
    setJourney("service");
    setServiceSource(source);
    setServiceId(id);
    if(source!=="catalog")setSelectedStyle(null);
    setDate("");
    setTime("");
    setCart({});
    setScreen("mode");
  }

  function chooseComboService(id:number){
    setServiceId(id);
    setSelectedStyle(null);
    setServiceSource("picker");
    setDate("");
    setTime("");
    setScreen("mode");
  }

  function chooseCatalogStyle(item:CatalogItem){
    const base=data.services.find(s=>normalize(s.name)==="corte")||data.services.find(s=>normalize(s.name).startsWith("corte"));
    if(!base){
      setError("O serviço Corte precisa estar ativo para agendar um estilo do catálogo.");
      return;
    }
    setSelectedStyle(item);
    setJourney("service");
    setServiceSource("catalog");
    setServiceId(base.id);
    setMode("schedule");
    setDate("");
    setTime("");
    setCart({});
    setScreen("mode");
  }

  function chooseMode(next:"schedule"|"notice"){
    setMode(next);
    setTime("");
    setScreen("datetime");
  }

  function chooseDate(next:string){
    setDate(next);
    setTime("");
    if(next>=localDateKey() && mode==="notice")setScreen("products");
  }

  function chooseTime(next:string){
    setTime(next);
    setScreen("products");
  }

  function updateProduct(product:Product,delta:number){
    setCart(current=>{
      const existing=current[product.id]||0;
      const next=Math.max(0,Math.min(Number(product.stock)||0,existing+delta));
      const copy={...current};
      if(next===0)delete copy[product.id];
      else copy[product.id]=next;
      return copy;
    });
  }

  function previous(){
    if(screen==="catalog"){
      setScreen("entry");
      return;
    }
    if(screen==="mode"&&serviceSource==="catalog"){
      setJourney("");
      setServiceSource("");
      setServiceId(0);
      setSelectedStyle(null);
      setScreen("catalog");
      return;
    }
    const currentFlow=flowFor(journey,serviceSource);
    const index=currentFlow.indexOf(screen);
    if(index<=0){resetOrder();return;}
    setScreen(currentFlow[index-1]);
  }

  function continueFromProducts(){
    if(journey==="combo"&&cartItems.length===0)return;
    if(journey==="product"&&cartItems.length===0)return;
    setScreen("summary");
  }

  const formattedDate=date?new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}):"";
  const productLines=cartItems.map(({product,quantity})=>`- ${quantity}x ${product.name} — ${price(product.priceCents*quantity)}`).join("\n");
  const styleLine=selectedStyle?`\nEstilo escolhido: ${selectedStyle.name}`:"";
  const whatsappText=journey==="product"
    ? `Olá, Yuri! Gostaria de encomendar os seguintes produtos da Yuri Barbershop.\n\nCliente: ${profile?.name||"Cliente"}\n\nPRODUTOS\n${productLines}\n\nTotal do pedido: ${price(total)}\n\nAguardo a confirmação de disponibilidade pelo WhatsApp.`
    : `Olá, Yuri! Gostaria de ${mode==="schedule"?"solicitar um horário":"avisar o dia em que pretendo ir"} e confirmar meu pedido.\n\nCliente: ${profile?.name||"Cliente"}\nServiço: ${service?.name||""}${styleLine}\nValor do serviço: ${service?price(service.priceCents):""}\nData: ${formattedDate}${mode==="schedule"?`\nHorário desejado: ${time}`:"\nSem reserva de horário"}\nProfissional: ${selectedCollaborator?.name||"Conforme disponibilidade"}${cartItems.length?`\n\nPRODUTOS\n${productLines}`:""}\n\nTotal: ${price(total)}\n\n${mode==="schedule"?"Sei que o horário depende da confirmação pelo WhatsApp.":"Estou apenas avisando o dia em que pretendo comparecer."}${cartItems.length?" Os produtos também ficam sujeitos à confirmação de estoque.":""}`;
  const message=encodeURIComponent(whatsappText);

  const screenTitle=screen==="entry"?"Sua Central":screen==="catalog"?"Catálogo de cortes":screen==="service"?"Escolha o serviço":screen==="mode"?"Como deseja ser atendido?":screen==="datetime"?(mode==="schedule"?"Escolha data e horário":"Escolha o dia da visita"):screen==="products"?(journey==="product"?"Escolha seus produtos":"Quer adicionar produtos?"):"Revise seu pedido";
  const showProgress=!loading&&!['entry','catalog'].includes(screen);

  return <section className="mobile-booking-app booking-commerce-app booking-hub-app" aria-label="Central Yuri Barbershop">
    <header className="mobile-flow-header booking-hub-header">
      <div>
        <small>YURI BARBERSHOP</small>
        <strong>{screenTitle}</strong>
      </div>
      {screen!=="entry"&&<button type="button" onClick={previous} aria-label="Voltar uma etapa">← Voltar</button>}
    </header>

    {showProgress&&<div className="mobile-progress booking-commerce-progress" aria-label={`Etapa ${stepIndex+1} de ${flow.length}`}>
      {flow.map((item,index)=><span key={item} className={index<=stepIndex?"active":""}><i>{index+1}</i></span>)}
    </div>}

    {loading?<div className="mobile-booking-loading">Montando sua Central...</div>:<div className="mobile-stage-wrap">
      {screen==="entry"&&<div className="mobile-stage booking-hub-home">
        <section className="booking-hub-hero">
          <div><small>OLÁ{profile?.name?`, ${profile.name.split(" ")[0].toUpperCase()}`:""}</small><h2>O que você quer fazer hoje?</h2><p>Agende, escolha produtos, descubra cortes e acompanhe seus benefícios em um só lugar.</p></div>
          {upcoming&&<button type="button" className="booking-next-appointment" onClick={()=>openClientSection("Meus horários")}><small>PRÓXIMO ATENDIMENTO</small><strong>{upcoming.serviceName}</strong><span>{new Date(`${upcoming.date}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} · {upcoming.time} →</span></button>}
        </section>

        <section className="booking-hub-section">
          <div className="booking-hub-section-head"><div><small>FAÇA AGORA</small><h3>Comece por aqui</h3></div></div>
          <div className="booking-entry-grid booking-hub-actions">
            <button type="button" onClick={()=>chooseJourney("service")}><span className="booking-entry-icon">✂</span><div><strong>Agendar serviço</strong><small>Escolha o atendimento e marque o melhor horário.</small></div><b>→</b></button>
            <button type="button" onClick={()=>chooseJourney("product")}><span className="booking-entry-icon">▣</span><div><strong>Comprar produto</strong><small>Monte seu pedido sem precisar agendar.</small></div><b>→</b></button>
            <button type="button" className="featured" onClick={()=>chooseJourney("combo")}><span className="booking-entry-icon">✂+</span><div><strong>Serviço + produto</strong><small>Agende e já deixe seus produtos separados.</small></div><b>→</b></button>
          </div>
        </section>

        <section className="booking-hub-section">
          <div className="booking-hub-section-head"><div><small>NOSSOS SERVIÇOS</small><h3>Escolha e já agende</h3></div><span>{data.services.length} opções</span></div>
          <div className="booking-hub-service-grid">
            {data.services.map(item=><button type="button" key={item.id} onClick={()=>journey==="combo"?chooseComboService(item.id):chooseService(item.id,"direct")}><span className="booking-hub-service-icon">✂</span><div><strong>{item.name}</strong><small>{item.durationMin} min</small></div><b>{price(item.priceCents)}</b><i>Agendar →</i></button>)}
          </div>
        </section>

        <section className="booking-hub-section">
          <div className="booking-hub-section-head"><div><small>ENCONTRE SEU VISUAL</small><h3>Escolha pelo estilo</h3></div></div>
          <button type="button" className="booking-catalog-feature" onClick={()=>setScreen("catalog")}>
            <div className="booking-catalog-collage">{cutCatalog.slice(0,3).map((item,index)=>{const image=storedImage(item.imageKey);return <span key={item.id} style={{zIndex:3-index}}>{image?<img src={image} alt=""/>:"✂"}</span>})}</div>
            <div><small>CATÁLOGO DE CORTES</small><strong>Veja um corte, escolha e transforme em agendamento.</strong><p>Ao selecionar um estilo, o serviço Corte já entra no seu pedido.</p></div><b>Explorar cortes →</b>
          </button>
        </section>

        <section className="booking-hub-section">
          <div className="booking-hub-section-head"><div><small>VANTAGENS YURI</small><h3>Mais motivos para voltar</h3></div></div>
          <div className="booking-benefit-grid">
            <button type="button" className="booking-benefit-card club" onClick={()=>openClientSection("Clube Yuri")}><span>♛</span><small>CLUBE YURI</small><strong>{activeSubscription?"Seu Clube está ativo":"Conheça o Clube Yuri"}</strong><p>{activeSubscription?`Ativo${activeSubscription.endDate?` até ${new Date(`${activeSubscription.endDate}T12:00:00`).toLocaleDateString("pt-BR")}`:""}.`:"Plano de R$ 120 com benefícios para manter o visual em dia."}</p><b>{activeSubscription?"Ver meu Clube":"Conhecer o plano"} →</b></button>
            <button type="button" className="booking-benefit-card loyalty" onClick={()=>openClientSection("Fidelidade")}><span>★</span><small>CARTÃO FIDELIDADE</small><strong>{loyaltyComplete?"Cartão completo!":`${loyaltyProgress} de ${loyaltyTarget} atendimentos`}</strong><div className="booking-loyalty-dots">{Array.from({length:Math.min(loyaltyTarget,10)},(_,index)=><i key={index} className={index<Math.min(loyaltyProgress,10)?"active":""}/>)}</div><p>{loyaltyComplete?"Confira seu benefício no cartão.":`Acompanhe seu progresso e conheça o benefício de fidelidade.`}</p><b>Ver meu cartão →</b></button>
            <button type="button" className="booking-benefit-card promo" onClick={()=>openClientSection("Promoções")}><span>✦</span><small>PROMOÇÕES</small><strong>{data.promotions.length?`${data.promotions.length} oferta${data.promotions.length>1?"s":""} disponível${data.promotions.length>1?"is":""}`:"Veja nossas novidades"}</strong><p>Condições e oportunidades da Yuri Barbershop sem pop-ups.</p><b>Ver promoções →</b></button>
          </div>
        </section>

        <section className="booking-hub-section booking-social-section">
          <div className="booking-hub-section-head"><div><small>CONECTE-SE</small><h3>Nos siga nas redes</h3></div></div>
          <div className="booking-social-grid">
            <a href="https://www.instagram.com/yuricbarbearia" target="_blank" rel="noreferrer"><span>◎</span><div><strong>Instagram</strong><small>Cortes, trabalhos e novidades</small></div><b>→</b></a>
            <a href="https://g.page/r/CaO2Z7is9bPgEAE/review" target="_blank" rel="noreferrer"><span>G</span><div><strong>Google</strong><small>Avalie sua experiência</small></div><b>→</b></a>
            <a href="https://wa.me/5562981007636?text=Ol%C3%A1%2C%20vim%20pela%20Central%20da%20Yuri%20Barbershop." target="_blank" rel="noreferrer"><span>◉</span><div><strong>WhatsApp</strong><small>Fale diretamente com a barbearia</small></div><b>→</b></a>
          </div>
        </section>
      </div>}

      {screen==="catalog"&&<div className="mobile-stage booking-catalog-stage">
        <div className="mobile-stage-intro"><h2>Escolha seu próximo corte</h2><p>Gostou de um estilo? Toque em “Quero esse corte” e continue direto para o agendamento.</p></div>
        {cutCatalog.length?<div className="booking-style-grid">{cutCatalog.map(item=>{const image=storedImage(item.imageKey);return <article key={item.id}><div className="booking-style-image">{image?<img src={image} alt={item.name}/>:<span>✂</span>}</div><div><small>{item.category||"Corte"}</small><strong>{item.name}</strong><p>{item.description||"Estilo disponível no catálogo Yuri Barbershop."}</p><button type="button" onClick={()=>chooseCatalogStyle(item)}>Quero esse corte →</button></div></article>})}</div>:<div className="booking-no-products">Cadastre cortes no Catálogo de estilos para eles aparecerem aqui.</div>}
      </div>}

      {screen==="service"&&<div className="mobile-stage mobile-stage-services">
        <div className="mobile-stage-intro"><h2>O que vamos fazer hoje?</h2><p>Todos os serviços ativos da barbearia aparecem aqui automaticamente.</p></div>
        <div className="mobile-service-grid">{data.services.map(s=><button type="button" key={s.id} className={serviceId===s.id?"selected":""} onClick={()=>journey==="combo"?chooseComboService(s.id):chooseService(s.id,"picker")}><span>{s.name}</span><strong>{price(s.priceCents)}</strong><small>{s.durationMin} min <b>→</b></small></button>)}</div>
      </div>}

      {screen==="mode"&&<div className="mobile-stage">
        <div className="mobile-stage-intro"><h2>{selectedStyle?.name||service?.name}</h2><p>{selectedStyle?`${service?.name} · ${service?price(service.priceCents):""} · ${service?.durationMin||""} min`:service?`${price(service.priceCents)} · ${service.durationMin} min`:""}</p></div>
        {selectedStyle&&<div className="booking-selected-style"><span>ESTILO ESCOLHIDO</span><strong>{selectedStyle.name}</strong><small>Será enviado junto com o pedido para o WhatsApp.</small></div>}
        {collaborators.length>1&&<div className="mobile-professional-block"><label>Profissional</label><div className="mobile-choice-row"><button type="button" className={!collaboratorId?"selected":""} onClick={()=>setCollaboratorId(0)}>Qualquer profissional</button>{collaborators.map(c=><button type="button" key={c.id} className={collaboratorId===c.id?"selected":""} onClick={()=>setCollaboratorId(c.id)}>{c.name}</button>)}</div></div>}
        <div className="mobile-mode-stack"><button type="button" onClick={()=>chooseMode("schedule")}><span>◷</span><div><strong>Agendar um horário</strong><small>Escolher dia e hora disponíveis</small></div><b>→</b></button><button type="button" onClick={()=>chooseMode("notice")}><span>↗</span><div><strong>Só avisar o dia</strong><small>Sem reservar um horário específico</small></div><b>→</b></button></div>
      </div>}

      {screen==="datetime"&&<div className="mobile-stage"><div className="mobile-stage-intro"><h2>{mode==="schedule"?"Quando você quer vir?":"Qual dia você pretende vir?"}</h2><p>Datas anteriores a hoje não podem ser selecionadas.</p></div><label className="mobile-date-field">Data<input type="date" min={localDateKey()} value={date} onChange={e=>chooseDate(e.target.value)}/></label>{mode==="schedule"&&validDate&&<><div className="mobile-time-label"><strong>Horários disponíveis</strong><small>{availabilityLoading?"Conferindo a agenda...":"Toque em um horário para continuar"}</small></div><div className="mobile-time-grid">{!availabilityLoading&&times.length?times.map(slot=><button type="button" key={slot} className={time===slot?"selected":""} onClick={()=>chooseTime(slot)}>{slot}</button>):!availabilityLoading?<p>Nenhum horário futuro disponível nesta data.</p>:null}</div></>}</div>}

      {screen==="products"&&<div className="mobile-stage booking-products-stage"><div className="mobile-stage-intro"><h2>{journey==="product"?"O que você quer levar?":"Complete seu atendimento"}</h2><p>{journey==="product"?"Escolha um ou mais produtos e a quantidade.":journey==="combo"?"Adicione pelo menos um produto ao pedido.":"Se quiser, adicione produtos para manter o resultado em casa. Esta etapa é opcional."}</p></div>{availableProducts.length?<div className="booking-product-grid">{availableProducts.map(product=>{const quantity=cart[product.id]||0;const image=storedImage(product.imageKey);return <article key={product.id} className={quantity?"selected":""}><div className="booking-product-image">{image?<img src={image} alt={product.name}/>:<span>Y</span>}</div><div className="booking-product-copy"><strong>{product.name}</strong><p>{product.description||"Produto disponível na Yuri Barbershop."}</p><b>{price(product.priceCents)}</b><small>{product.stock} em estoque</small></div><div className="booking-product-controls">{quantity>0?<><button type="button" onClick={()=>updateProduct(product,-1)} aria-label={`Remover uma unidade de ${product.name}`}>−</button><strong>{quantity}</strong><button type="button" onClick={()=>updateProduct(product,1)} disabled={quantity>=product.stock} aria-label={`Adicionar uma unidade de ${product.name}`}>+</button></>:<button type="button" className="add" onClick={()=>updateProduct(product,1)}>+ Adicionar</button>}</div></article>})}</div>:<div className="booking-no-products">Nenhum produto com estoque disponível no momento.</div>}<div className="booking-cart-bar"><div><small>{cartItems.reduce((sum,item)=>sum+item.quantity,0)} item(ns)</small><strong>{price(productTotal)}</strong></div><button type="button" onClick={continueFromProducts} disabled={(journey==="product"||journey==="combo")&&cartItems.length===0}>{journey==="service"&&cartItems.length===0?"Continuar sem produto":"Revisar pedido"} <span>→</span></button></div></div>}

      {screen==="summary"&&readyForSummary&&<div className="mobile-stage"><div className="mobile-booking-summary booking-commerce-summary"><small>RESUMO DO PEDIDO</small><h3>{journey==="product"?"Produtos":selectedStyle?.name||service?.name}</h3>{journey!=="product"&&<div className="booking-summary-service"><span>Data<b>{formattedDate}</b></span>{mode==="schedule"&&<span>Horário<b>{time}</b></span>}<span>Serviço<b>{service?price(service.priceCents):""}</b></span><span>Profissional<b>{selectedCollaborator?.name||"Conforme disponibilidade"}</b></span></div>}{selectedStyle&&<div className="booking-summary-style"><small>ESTILO ESCOLHIDO</small><strong>{selectedStyle.name}</strong></div>}{cartItems.length>0&&<div className="booking-summary-products"><small>PRODUTOS</small>{cartItems.map(({product,quantity})=><div key={product.id}><span>{quantity}x {product.name}</span><b>{price(product.priceCents*quantity)}</b></div>)}</div>}<div className="booking-summary-total"><span>Total</span><strong>{price(total)}</strong></div><p>{journey==="product"?"O pedido e o estoque serão confirmados pelo Yuri no WhatsApp.":mode==="schedule"?"O horário e os produtos serão confirmados pelo Yuri no WhatsApp.":"Este pedido informa o dia da visita; produtos e disponibilidade serão confirmados pelo WhatsApp."}</p></div><button className="mobile-edit-choice" type="button" onClick={resetOrder}>Voltar para a Central</button><a className="mobile-whatsapp-button" href={`https://wa.me/5562981007636?text=${message}`} target="_blank" rel="noreferrer">{journey==="product"?"Encomendar pelo WhatsApp":"Enviar pedido no WhatsApp"} <span>→</span></a></div>}

      {screen==="summary"&&!readyForSummary&&<div className="mobile-stage"><p className="mobile-booking-error">Faltam dados para concluir. Volte uma etapa e confira sua escolha.</p></div>}
      {error&&<p className="mobile-booking-error">{error}</p>}
    </div>}
  </section>;
}
