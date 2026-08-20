"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Service = { id:number; name:string; priceCents:number; durationMin:number };
type Collaborator = { id:number; name:string; active:boolean };
type Product = { id:number; name:string; description?:string; priceCents:number; stock:number; imageKey?:string; featured?:boolean };
type CatalogItem = { id:number|string; name:string; category:string; description?:string; imageKey?:string };
type Promotion = { id:number|string; title:string; description?:string; validUntil?:string|null };
type Subscription = { id:number; status:string; startDate?:string; endDate?:string };
type Appointment = { id:number; date:string; time:string; serviceId:number; serviceName:string; status:string };
type Data = {
  services: Service[];
  products: Product[];
  collaborators: Collaborator[];
  profiles: Array<{ name:string; phone?:string; birthDate?:string }>;
  catalogItems: CatalogItem[];
  promotions: Promotion[];
  subscriptions: Subscription[];
  appointments: Appointment[];
  settings: { loyaltyTarget?:number; loyaltyReward?:string };
};
type Journey = "service" | "product" | "combo" | "";
type Screen = "entry" | "catalog" | "service" | "mode" | "datetime" | "products" | "summary";
type ServiceSource = "picker" | "direct" | "catalog" | "";

const EMPTY_DATA: Data = {
  services: [],
  products: [],
  collaborators: [],
  profiles: [],
  catalogItems: [],
  promotions: [],
  subscriptions: [],
  appointments: [],
  settings: {},
};

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

async function fetchJson(url:string, init:RequestInit={}, timeoutMs=8000){
  const controller=new AbortController();
  const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...init,cache:"no-store",signal:controller.signal});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(String(body?.error||"Não foi possível concluir esta ação."));
    return body;
  }finally{
    window.clearTimeout(timer);
  }
}

function SocialIcon({kind}:{kind:"instagram"|"google"|"whatsapp"}){
  if(kind==="instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.8" r="1.15" fill="currentColor"/></svg>;
  if(kind==="whatsapp") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.4a9.2 9.2 0 0 0-7.9 13.9L2.7 21.6l5.4-1.3A9.2 9.2 0 1 0 12 2.4Zm0 2a7.2 7.2 0 0 1 0 14.4c-1.3 0-2.5-.3-3.6-.9l-.5-.3-2.5.6.6-2.4-.3-.5A7.2 7.2 0 0 1 12 4.4Zm-2.7 3.4c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1 2.3.2.3 1.5 2.4 3.7 3.2 1.8.7 2.2.6 2.7.5.4-.1 1.4-.6 1.6-1.1.2-.5.2-.9.1-1-.1-.2-.4-.3-.8-.5l-1.7-.8c-.4-.2-.6-.2-.9.2-.3.4-.9 1.1-1.1 1.3-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.8-1.8-1-.9-1.7-2.1-1.9-2.4-.2-.3 0-.5.1-.7l.6-.7c.2-.2.2-.4.3-.6.1-.2 0-.5 0-.6l-.8-1.9c-.2-.5-.4-.5-.7-.5h-.6Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.2 3-7.2Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.4l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2 10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>;
}

export default function MobileBookingBridge(){
  const [target,setTarget]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    const existing=document.querySelector(".booking-with-ads") as HTMLElement|null;
    if(existing){setTarget(existing);return;}
    const observer=new MutationObserver(()=>{
      const found=document.querySelector(".booking-with-ads") as HTMLElement|null;
      if(found){setTarget(found);observer.disconnect();}
    });
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
    return()=>{sidebar.querySelector(".mobile-return-booking")?.remove();};
  },[target]);

  if(!target)return null;
  return createPortal(<BookingCommerce/>,target);
}

function BookingCommerce(){
  const [data,setData]=useState<Data>(EMPTY_DATA);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
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
  const [submitting,setSubmitting]=useState(false);
  const [createdAppointmentId,setCreatedAppointmentId]=useState<number|null>(null);

  const loadData=useCallback(async()=>{
    setLoading(true);setLoadError("");
    try{
      let json:any;
      try{json=await fetchJson("/api/booking");}
      catch{await new Promise(resolve=>window.setTimeout(resolve,300));json=await fetchJson("/api/booking");}
      const nextData:Data={services:Array.isArray(json.services)?json.services:[],products:Array.isArray(json.products)?json.products:[],collaborators:Array.isArray(json.collaborators)?json.collaborators:[],profiles:Array.isArray(json.profiles)?json.profiles:[],catalogItems:Array.isArray(json.catalogItems)?json.catalogItems:[],promotions:Array.isArray(json.promotions)?json.promotions:[],subscriptions:Array.isArray(json.subscriptions)?json.subscriptions:[],appointments:Array.isArray(json.appointments)?json.appointments:[],settings:json.settings||{}};
      setData(nextData);
      const active=nextData.collaborators.filter(c=>c.active);
      if(active.length===1)setCollaboratorId(active[0].id);
    }catch(e){setLoadError(e instanceof Error?e.message:"Não foi possível carregar a Central.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void loadData();},[loadData]);

  const service=useMemo(()=>data.services.find(s=>s.id===serviceId),[data.services,serviceId]);
  const collaborators=data.collaborators.filter(c=>c.active);
  const profile=data.profiles[0];
  const selectedCollaborator=collaborators.find(c=>c.id===collaboratorId);
  const availableProducts=useMemo(()=>data.products.filter(p=>Number(p.stock)>0),[data.products]);
  const cutCatalog=useMemo(()=>{const cuts=data.catalogItems.filter(item=>normalize(item.category||"").includes("corte"));return cuts.length?cuts:data.catalogItems.filter(item=>/corte|fade|degrade|social/i.test(item.name));},[data.catalogItems]);
  const validDate=Boolean(date&&date>=localDateKey());
  const rawTimes=slotsFor(date,service?.durationMin||30);
  const times=rawTimes.filter(slot=>!occupiedTimes.includes(slot));
  const flow=flowFor(journey,serviceSource);
  const stepIndex=Math.max(0,flow.indexOf(screen));
  const cartItems=useMemo(()=>availableProducts.map(product=>({product,quantity:cart[product.id]||0})).filter(item=>item.quantity>0),[availableProducts,cart]);
  const productTotal=cartItems.reduce((sum,item)=>sum+item.product.priceCents*item.quantity,0);
  const serviceTotal=journey==="product"?0:(service?.priceCents||0);
  const total=serviceTotal+productTotal;
  const readyForSummary=journey==="product"?cartItems.length>0:Boolean(service&&validDate&&(mode==="notice"||time)&&(journey!=="combo"||cartItems.length>0));

  const today=localDateKey();
  const upcoming=useMemo(()=>data.appointments.filter(item=>item.status!=="Cancelado"&&item.date>=today).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]||null,[data.appointments,today]);
  const activeSubscription=useMemo(()=>data.subscriptions.find(item=>item.status==="Ativa"&&(!item.endDate||item.endDate>=today))||null,[data.subscriptions,today]);
  const finalizedCount=data.appointments.filter(item=>item.status==="Finalizado").length;
  const loyaltyTarget=Math.max(1,Number(data.settings?.loyaltyTarget||10));
  const loyaltyProgress=finalizedCount===0?0:((finalizedCount-1)%loyaltyTarget)+1;
  const loyaltyComplete=finalizedCount>0&&loyaltyProgress===loyaltyTarget;

  useEffect(()=>{
    if(!date||!serviceId||mode!=="schedule"){setOccupiedTimes([]);return;}
    const controller=new AbortController();let alive=true;const timeout=window.setTimeout(()=>controller.abort(),7000);setAvailabilityLoading(true);
    const query=new URLSearchParams({date,serviceId:String(serviceId)});if(collaboratorId)query.set("collaboratorId",String(collaboratorId));
    fetch(`/api/booking?${query.toString()}`,{cache:"no-store",signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(json=>{if(alive)setOccupiedTimes(Array.isArray(json.occupiedTimes)?json.occupiedTimes:[]);}).catch(()=>{if(alive&&!controller.signal.aborted)setError("Não foi possível conferir os horários. Tente outra vez.");}).finally(()=>{window.clearTimeout(timeout);if(alive)setAvailabilityLoading(false);});
    return()=>{alive=false;window.clearTimeout(timeout);controller.abort();};
  },[date,serviceId,mode,collaboratorId]);

  useEffect(()=>{if(date&&date<localDateKey()){setDate("");setTime("");}},[date]);
  useEffect(()=>{if(time&&!times.includes(time))setTime("");},[date,serviceId,occupiedTimes]);

  function resetOrder(){setJourney("");setScreen("entry");setServiceSource("");setServiceId(0);setSelectedStyle(null);setMode("schedule");setDate("");setTime("");setCart({});setOccupiedTimes([]);setCreatedAppointmentId(null);setError("");}
  function chooseJourney(next:Exclude<Journey,"">){setJourney(next);setServiceSource(next==="product"?"":"picker");setServiceId(0);setSelectedStyle(null);setMode("schedule");setDate("");setTime("");setCart({});setCreatedAppointmentId(null);setError("");setScreen(next==="product"?"products":"service");}
  function chooseService(id:number,source:ServiceSource="picker"){setJourney(current=>current==="combo"?"combo":"service");setServiceSource(source);setServiceId(id);if(source!=="catalog")setSelectedStyle(null);setDate("");setTime("");setCreatedAppointmentId(null);setError("");setScreen("mode");}
  function chooseCatalogStyle(item:CatalogItem){const base=data.services.find(s=>normalize(s.name)==="corte")||data.services.find(s=>normalize(s.name).startsWith("corte"));if(!base){setError("O serviço Corte precisa estar ativo para agendar este estilo.");return;}setSelectedStyle(item);setJourney("service");setServiceSource("catalog");setServiceId(base.id);setMode("schedule");setDate("");setTime("");setCart({});setCreatedAppointmentId(null);setScreen("mode");}
  function chooseMode(next:"schedule"|"notice"){setMode(next);setTime("");setCreatedAppointmentId(null);setError("");setScreen("datetime");}
  function chooseDate(next:string){setDate(next);setTime("");setCreatedAppointmentId(null);setError("");if(next>=localDateKey()&&mode==="notice")setScreen("products");}
  function chooseTime(next:string){setTime(next);setCreatedAppointmentId(null);setError("");setScreen("products");}
  function updateProduct(product:Product,delta:number){setCreatedAppointmentId(null);setCart(current=>{const existing=current[product.id]||0;const next=Math.max(0,Math.min(Number(product.stock)||0,existing+delta));const copy={...current};if(next===0)delete copy[product.id];else copy[product.id]=next;return copy;});}
  function previous(){if(screen==="catalog"){setScreen("entry");return;}if(screen==="mode"&&serviceSource==="catalog"){setScreen("catalog");return;}const currentFlow=flowFor(journey,serviceSource);const index=currentFlow.indexOf(screen);if(index<=0){resetOrder();return;}setScreen(currentFlow[index-1]);}
  function continueFromProducts(){if((journey==="combo"||journey==="product")&&cartItems.length===0)return;setScreen("summary");}

  const formattedDate=date?new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}):"";
  const productLines=cartItems.map(({product,quantity})=>`- ${quantity}x ${product.name} — ${price(product.priceCents*quantity)}`).join("\n");

  async function finish(){
    if(submitting)return;setError("");setSubmitting(true);
    try{
      let appointmentId=createdAppointmentId;
      if(journey!=="product"&&mode==="schedule"&&!appointmentId){const result=await fetchJson("/api/booking",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"appointment",serviceId:service?.id,date,time,collaboratorId:collaboratorId||undefined,styleName:selectedStyle?.name||"",products:cartItems.map(({product,quantity})=>({id:product.id,quantity}))})});appointmentId=Number(result?.appointment?.id||0)||null;setCreatedAppointmentId(appointmentId);}
      const protocol=appointmentId?`\nProtocolo do agendamento: #${appointmentId}`:"";const styleLine=selectedStyle?`\nEstilo escolhido: ${selectedStyle.name}`:"";
      const whatsappText=journey==="product"?`Olá, Yuri! Gostaria de encomendar os seguintes produtos da Yuri Barbershop.\n\nCliente: ${profile?.name||"Cliente"}\n\nPRODUTOS\n${productLines}\n\nTotal do pedido: ${price(total)}\n\nAguardo a confirmação de disponibilidade pelo WhatsApp.`:`Olá, Yuri! Gostaria de ${mode==="schedule"?"confirmar meu agendamento":"avisar o dia em que pretendo ir"}.\n\nCliente: ${profile?.name||"Cliente"}\nServiço: ${service?.name||""}${styleLine}\nValor do serviço: ${service?price(service.priceCents):""}\nData: ${formattedDate}${mode==="schedule"?`\nHorário: ${time}`:"\nSem reserva de horário"}\nProfissional: ${selectedCollaborator?.name||"Conforme disponibilidade"}${cartItems.length?`\n\nPRODUTOS\n${productLines}`:""}\n\nTotal: ${price(total)}${protocol}\n\n${mode==="schedule"?"O pedido já foi registrado no sistema e segue para confirmação.":"Estou apenas avisando o dia em que pretendo comparecer."}${cartItems.length?" Os produtos ficam sujeitos à confirmação de estoque.":""}`;
      window.location.assign(`https://wa.me/5562981007636?text=${encodeURIComponent(whatsappText)}`);
    }catch(e){const message=e instanceof Error?e.message:"Não foi possível concluir.";setError(message);if(/reservado|horário|bloqueado/i.test(message)){setTime("");setScreen("datetime");}}
    finally{setSubmitting(false);}
  }

  if(loading)return <section className="mobile-booking-app booking-commerce-app booking-hub-v2"><div className="booking-central-loading"><span className="booking-central-spinner"/><strong>Carregando sua Central...</strong><small>Serviços, horários e benefícios.</small></div></section>;
  if(loadError)return <section className="mobile-booking-app booking-commerce-app booking-hub-v2"><div className="booking-central-error"><strong>Não conseguimos carregar a Central agora.</strong><p>{loadError}</p><button type="button" onClick={()=>void loadData()}>Tentar novamente</button></div></section>;

  const showProgress=!["entry","catalog"].includes(screen);
  const screenTitle=screen==="catalog"?"Catálogo de cortes":screen==="service"?"Escolha o serviço":screen==="mode"?"Como deseja ser atendido?":screen==="datetime"?(mode==="schedule"?"Escolha data e horário":"Escolha o dia da visita"):screen==="products"?(journey==="product"?"Escolha seus produtos":"Quer adicionar produtos?"):"Revise seu pedido";

  return <section className="mobile-booking-app booking-commerce-app booking-hub-v2" aria-label="Central de agendamento Yuri Barbershop">
    {screen!=="entry"&&<header className="mobile-flow-header"><div><small>YURI BARBERSHOP</small><strong>{screenTitle}</strong></div><button type="button" onClick={previous} aria-label="Voltar uma etapa">← Voltar</button></header>}
    {showProgress&&<div className="mobile-progress booking-commerce-progress" aria-label={`Etapa ${stepIndex+1} de ${flow.length}`}>{flow.map((item,index)=><span key={item} className={index<=stepIndex?"active":""}><i>{index+1}</i></span>)}</div>}
    <div className="mobile-stage-wrap">
      {screen==="entry"&&<div className="mobile-stage booking-central-home">
        <section className="booking-central-hero"><small>YURI BARBERSHOP</small><h2>O que você deseja hoje?</h2><p>Agende, compre produtos e acompanhe seus benefícios em um só lugar.</p>{upcoming&&<button type="button" className="booking-central-next" onClick={()=>openClientSection("Meus horários")}><small>PRÓXIMO ATENDIMENTO</small><strong>{upcoming.serviceName}</strong><span>{new Date(`${upcoming.date}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} · {upcoming.time} →</span></button>}</section>
        <div className="booking-central-actions"><button type="button" onClick={()=>chooseJourney("service")}><span className="booking-entry-icon">✂</span><div><strong>Agendar serviço</strong><small>Escolha o atendimento e marque o melhor horário.</small></div><b>→</b></button><button type="button" onClick={()=>chooseJourney("product")}><span className="booking-entry-icon">▣</span><div><strong>Comprar produto</strong><small>Monte seu pedido e finalize pelo WhatsApp.</small></div><b>→</b></button><button type="button" onClick={()=>chooseJourney("combo")}><span className="booking-entry-icon">✂+</span><div><strong>Serviço + produto</strong><small>Agende e já deixe seus produtos separados.</small></div><b>→</b></button></div>
        <section className="booking-central-services"><div className="booking-central-title"><strong>Nossos serviços</strong><small>{data.services.length} opções</small></div><div className="booking-central-service-grid">{data.services.map(item=><button type="button" key={item.id} onClick={()=>chooseService(item.id,"direct")}><span>✂</span><div><strong>{item.name}</strong><small>{item.durationMin} min</small></div><b>{price(item.priceCents)}</b><i>Agendar →</i></button>)}</div></section>
        <button type="button" className="booking-central-catalog" onClick={()=>setScreen("catalog")}><div className="booking-central-collage">{cutCatalog.slice(0,3).map((item,index)=>{const image=storedImage(item.imageKey);return <span key={item.id} style={{zIndex:3-index}}>{image?<img loading="lazy" decoding="async" src={image} alt=""/>:"✂"}</span>})}</div><div><small>CATÁLOGO DE CORTES</small><strong>Escolha um estilo e já transforme em agendamento.</strong><p>O corte escolhido vai junto no seu pedido.</p></div><b>Explorar →</b></button>
        <div className="booking-central-benefits"><button type="button" onClick={()=>openClientSection("Clube Yuri")}><span>♛</span><small>CLUBE YURI</small><strong>{activeSubscription?"Seu Clube está ativo":"Plano de R$ 120"}</strong><p>{activeSubscription?`Assinatura ativa${activeSubscription.endDate?` até ${new Date(`${activeSubscription.endDate}T12:00:00`).toLocaleDateString("pt-BR")}`:""}.`:"Até 6 atendimentos por ciclo. Conheça as formas de pagamento."}</p><b>{activeSubscription?"Ver meu Clube":"Conhecer o Clube"} →</b></button><button type="button" onClick={()=>openClientSection("Fidelidade")}><span>★</span><small>CARTÃO FIDELIDADE</small><strong>{loyaltyComplete?"Cartão completo!":`${loyaltyProgress} de ${loyaltyTarget}`}</strong><p>{loyaltyComplete?"Confira seu benefício.":"Acompanhe seu progresso a cada atendimento finalizado."}</p><b>Ver cartão →</b></button><button type="button" onClick={()=>openClientSection("Promoções")}><span>✦</span><small>PROMOÇÕES</small><strong>{data.promotions.length?`${data.promotions.length} oferta${data.promotions.length>1?"s":""}`:"Novidades Yuri"}</strong><p>Veja as condições disponíveis sem pop-ups.</p><b>Ver promoções →</b></button></div>
        <section className="booking-central-social"><div className="booking-central-title"><strong>Nos siga nas redes</strong></div><div><a href="https://www.instagram.com/yuricbarbearia" target="_blank" rel="noreferrer"><span className="instagram"><SocialIcon kind="instagram"/></span><div><strong>Instagram</strong><small>Cortes, trabalhos e novidades</small></div><b>→</b></a><a href="https://g.page/r/CaO2Z7is9bPgEAE/review" target="_blank" rel="noreferrer"><span className="google"><SocialIcon kind="google"/></span><div><strong>Google</strong><small>Avalie sua experiência</small></div><b>→</b></a><a href="https://wa.me/5562981007636?text=Ol%C3%A1%2C%20vim%20pela%20Central%20da%20Yuri%20Barbershop." target="_blank" rel="noreferrer"><span className="whatsapp"><SocialIcon kind="whatsapp"/></span><div><strong>WhatsApp</strong><small>Fale diretamente com a barbearia</small></div><b>→</b></a></div></section>
      </div>}
      {screen==="catalog"&&<div className="mobile-stage booking-catalog-stage"><div className="mobile-stage-intro"><h2>Escolha seu próximo corte</h2><p>Gostou de um estilo? Toque em “Quero esse corte” e continue direto para o agendamento.</p></div>{cutCatalog.length?<div className="booking-central-style-grid">{cutCatalog.map(item=>{const image=storedImage(item.imageKey);return <article key={item.id}><div>{image?<img loading="lazy" decoding="async" src={image} alt={item.name}/>:<span>✂</span>}</div><section><small>{item.category||"Corte"}</small><strong>{item.name}</strong><p>{item.description||"Estilo disponível no catálogo Yuri Barbershop."}</p><button type="button" onClick={()=>chooseCatalogStyle(item)}>Quero esse corte →</button></section></article>})}</div>:<div className="booking-no-products">Nenhum corte cadastrado no catálogo no momento.</div>}</div>}
      {screen==="service"&&<div className="mobile-stage mobile-stage-services"><div className="mobile-stage-intro"><h2>O que vamos fazer hoje?</h2><p>Toque em um serviço para continuar.</p></div><div className="mobile-service-grid">{data.services.map(s=><button type="button" key={s.id} className={serviceId===s.id?"selected":""} onClick={()=>chooseService(s.id,"picker")}><span>{s.name}</span><strong>{price(s.priceCents)}</strong><small>{s.durationMin} min <b>→</b></small></button>)}</div></div>}
      {screen==="mode"&&<div className="mobile-stage"><div className="mobile-stage-intro"><h2>{selectedStyle?.name||service?.name}</h2><p>{service?`${price(service.priceCents)} · ${service.durationMin} min`:""}</p></div>{selectedStyle&&<div className="booking-central-selected-style"><small>ESTILO ESCOLHIDO</small><strong>{selectedStyle.name}</strong></div>}{collaborators.length>1&&<div className="mobile-professional-block"><label>Profissional</label><div className="mobile-choice-row"><button type="button" className={!collaboratorId?"selected":""} onClick={()=>setCollaboratorId(0)}>Qualquer profissional</button>{collaborators.map(c=><button type="button" key={c.id} className={collaboratorId===c.id?"selected":""} onClick={()=>setCollaboratorId(c.id)}>{c.name}</button>)}</div></div>}<div className="mobile-mode-stack"><button type="button" onClick={()=>chooseMode("schedule")}><span>◷</span><div><strong>Agendar um horário</strong><small>Escolher dia e hora disponíveis</small></div><b>→</b></button><button type="button" onClick={()=>chooseMode("notice")}><span>↗</span><div><strong>Só avisar o dia</strong><small>Sem reservar um horário específico</small></div><b>→</b></button></div></div>}
      {screen==="datetime"&&<div className="mobile-stage"><div className="mobile-stage-intro"><h2>{mode==="schedule"?"Quando você quer vir?":"Qual dia você pretende vir?"}</h2><p>Datas anteriores a hoje não podem ser selecionadas.</p></div><label className="mobile-date-field">Data<input type="date" min={localDateKey()} value={date} onChange={e=>chooseDate(e.target.value)}/></label>{mode==="schedule"&&validDate&&<><div className="mobile-time-label"><strong>Horários disponíveis</strong><small>{availabilityLoading?"Conferindo a agenda...":"Toque em um horário para continuar"}</small></div><div className="mobile-time-grid">{!availabilityLoading&&times.length?times.map(slot=><button type="button" key={slot} className={time===slot?"selected":""} onClick={()=>chooseTime(slot)}>{slot}</button>):!availabilityLoading?<p>Nenhum horário futuro disponível nesta data.</p>:null}</div></>}</div>}
      {screen==="products"&&<div className="mobile-stage booking-products-stage"><div className="mobile-stage-intro"><h2>{journey==="product"?"O que você quer levar?":"Complete seu atendimento"}</h2><p>{journey==="product"?"Escolha um ou mais produtos e a quantidade.":journey==="combo"?"Adicione pelo menos um produto ao pedido.":"Se quiser, adicione produtos para manter o resultado em casa. Esta etapa é opcional."}</p></div>{availableProducts.length?<div className="booking-product-grid">{availableProducts.map(product=>{const quantity=cart[product.id]||0;const image=storedImage(product.imageKey);return <article key={product.id} className={quantity?"selected":""}><div className="booking-product-image">{image?<img loading="lazy" decoding="async" src={image} alt={product.name}/>:<span>Y</span>}</div><div className="booking-product-copy"><strong>{product.name}</strong><p>{product.description||"Produto disponível na Yuri Barbershop."}</p><b>{price(product.priceCents)}</b><small>{product.stock} em estoque</small></div><div className="booking-product-controls">{quantity>0?<><button type="button" onClick={()=>updateProduct(product,-1)} aria-label={`Remover uma unidade de ${product.name}`}>−</button><strong>{quantity}</strong><button type="button" onClick={()=>updateProduct(product,1)} disabled={quantity>=product.stock} aria-label={`Adicionar uma unidade de ${product.name}`}>+</button></>:<button type="button" className="add" onClick={()=>updateProduct(product,1)}>+ Adicionar</button>}</div></article>})}</div>:<div className="booking-no-products">Nenhum produto com estoque disponível no momento.</div>}<div className="booking-cart-bar"><div><small>{cartItems.reduce((sum,item)=>sum+item.quantity,0)} item(ns)</small><strong>{price(productTotal)}</strong></div><button type="button" onClick={continueFromProducts} disabled={(journey==="product"||journey==="combo")&&cartItems.length===0}>{journey==="service"&&cartItems.length===0?"Continuar sem produto":"Revisar pedido"} <span>→</span></button></div></div>}
      {screen==="summary"&&readyForSummary&&<div className="mobile-stage"><div className="mobile-booking-summary booking-commerce-summary"><small>RESUMO DO PEDIDO</small><h3>{journey==="product"?"Produtos":selectedStyle?.name||service?.name}</h3>{journey!=="product"&&<div className="booking-summary-service"><span>Data<b>{formattedDate}</b></span>{mode==="schedule"&&<span>Horário<b>{time}</b></span>}<span>Serviço<b>{service?price(service.priceCents):""}</b></span><span>Profissional<b>{selectedCollaborator?.name||"Conforme disponibilidade"}</b></span></div>}{selectedStyle&&<div className="booking-central-selected-style"><small>ESTILO ESCOLHIDO</small><strong>{selectedStyle.name}</strong></div>}{cartItems.length>0&&<div className="booking-summary-products"><small>PRODUTOS</small>{cartItems.map(({product,quantity})=><div key={product.id}><span>{quantity}x {product.name}</span><b>{price(product.priceCents*quantity)}</b></div>)}</div>}<div className="booking-summary-total"><span>Total</span><strong>{price(total)}</strong></div><p>{journey==="product"?"O pedido e o estoque serão confirmados pelo WhatsApp.":mode==="schedule"?"Ao continuar, o horário será registrado no sistema antes de abrir o WhatsApp.":"Este pedido apenas informa o dia da visita; não reserva um horário."}</p></div>{error&&<p className="mobile-booking-error">{error}</p>}<button className="mobile-edit-choice" type="button" onClick={resetOrder}>Alterar escolhas</button><button className="mobile-whatsapp-button booking-central-finish" type="button" onClick={()=>void finish()} disabled={submitting}>{submitting?"Registrando...":journey==="product"?"Encomendar pelo WhatsApp":mode==="schedule"?"Registrar e abrir WhatsApp":"Enviar pelo WhatsApp"} <span>→</span></button></div>}
      {screen==="summary"&&!readyForSummary&&<div className="mobile-stage"><p className="mobile-booking-error">Faltam dados para concluir. Volte uma etapa e confira sua escolha.</p></div>}
      {error&&screen!=="summary"&&<p className="mobile-booking-error">{error}</p>}
    </div>
  </section>;
}
