"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Service = { id:number; name:string; priceCents:number; durationMin:number };
type Collaborator = { id:number; name:string; active:boolean };

type Data = {
  services: Service[];
  collaborators: Collaborator[];
  profiles: Array<{ name:string; phone?:string; birthDate?:string }>;
};

function localDateKey(date = new Date()) {
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function price(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100)}

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

export default function MobileBookingBridge(){
  const [target,setTarget]=useState<HTMLElement|null>(null);
  useEffect(()=>{
    const sync=()=>setTarget(document.querySelector(".booking-with-ads") as HTMLElement|null);
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  if(!target)return null;
  return createPortal(<MobileBooking/>,target);
}

function MobileBooking(){
  const [data,setData]=useState<Data>({services:[],collaborators:[],profiles:[]});
  const [loading,setLoading]=useState(true);
  const [serviceId,setServiceId]=useState(0);
  const [collaboratorId,setCollaboratorId]=useState(0);
  const [mode,setMode]=useState<"schedule"|"notice">("schedule");
  const [date,setDate]=useState("");
  const [time,setTime]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/data").then(r=>r.ok?r.json():Promise.reject()).then((json)=>{
      setData(json);
      if(json.services?.[0])setServiceId(json.services[0].id);
      const active=(json.collaborators||[]).filter((c:Collaborator)=>c.active);
      if(active.length===1)setCollaboratorId(active[0].id);
    }).catch(()=>setError("Não foi possível carregar os dados do agendamento.")).finally(()=>setLoading(false));
  },[]);

  const service=useMemo(()=>data.services.find(s=>s.id===serviceId),[data.services,serviceId]);
  const collaborators=(data.collaborators||[]).filter(c=>c.active);
  const profile=data.profiles?.[0];
  const times=slotsFor(date,service?.durationMin||30);
  const selectedCollaborator=collaborators.find(c=>c.id===collaboratorId);
  const validDate=Boolean(date&&date>=localDateKey());
  const ready=Boolean(service&&validDate&&(mode==="notice"||time));

  useEffect(()=>{if(date&&date<localDateKey()){setDate("");setTime("");}},[date]);
  useEffect(()=>{if(time&&!times.includes(time))setTime("");},[date,serviceId]);

  const formattedDate=date?new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}):"";
  const message=encodeURIComponent(
    `Olá, Yuri! Gostaria de ${mode==="schedule"?"solicitar um horário":"avisar o dia em que pretendo ir"}.\n\n`+
    `Cliente: ${profile?.name||"Cliente"}\nServiço: ${service?.name||""}\nValor: ${service?price(service.priceCents):""}\n`+
    `Data: ${formattedDate}${mode==="schedule"?`\nHorário desejado: ${time}`:"\nSem reserva de horário"}\n`+
    `Profissional: ${selectedCollaborator?.name||"Conforme disponibilidade"}\n\n`+
    (mode==="schedule"?"Sei que o horário depende da confirmação pelo WhatsApp.":"Estou apenas avisando o dia em que pretendo comparecer.")
  );

  return <section className="mobile-booking-app" aria-label="Agendamento rápido">
    <header className="mobile-booking-hero">
      <div><small>AGENDAMENTO RÁPIDO</small><h2>Escolha seu atendimento</h2><p>Preencha em poucos passos e envie o pedido pelo WhatsApp.</p></div>
      <span>✂</span>
    </header>

    {loading?<div className="mobile-booking-loading">Carregando serviços...</div>:<>
      <div className="mobile-booking-step"><b>1</b><div><strong>Serviço</strong><small>Escolha o que deseja fazer</small></div></div>
      <div className="mobile-service-grid">
        {data.services.map(s=><button key={s.id} className={serviceId===s.id?"selected":""} onClick={()=>{setServiceId(s.id);setTime("")}}><span>{s.name}</span><strong>{price(s.priceCents)}</strong><small>{s.durationMin} min</small></button>)}
      </div>

      {collaborators.length>1&&<><div className="mobile-booking-step"><b>2</b><div><strong>Profissional</strong><small>Opcional</small></div></div><div className="mobile-choice-row"><button className={!collaboratorId?"selected":""} onClick={()=>setCollaboratorId(0)}>Qualquer profissional</button>{collaborators.map(c=><button key={c.id} className={collaboratorId===c.id?"selected":""} onClick={()=>setCollaboratorId(c.id)}>{c.name}</button>)}</div></>}

      <div className="mobile-booking-step"><b>{collaborators.length>1?3:2}</b><div><strong>Como você quer ser atendido?</strong><small>Escolha uma opção</small></div></div>
      <div className="mobile-mode-grid"><button className={mode==="schedule"?"selected":""} onClick={()=>setMode("schedule")}><strong>◷ Agendar horário</strong><small>Escolha data e hora</small></button><button className={mode==="notice"?"selected":""} onClick={()=>{setMode("notice");setTime("")}}><strong>→ Só avisar o dia</strong><small>Sem reservar horário</small></button></div>

      <div className="mobile-booking-step"><b>{collaborators.length>1?4:3}</b><div><strong>Data {mode==="schedule"?"e horário":"da visita"}</strong><small>Datas passadas ficam bloqueadas</small></div></div>
      <label className="mobile-date-field">Data<input type="date" min={localDateKey()} value={date} onChange={e=>{setDate(e.target.value);setTime("")}}/></label>
      {mode==="schedule"&&validDate&&<div className="mobile-time-grid">{times.length?times.map(slot=><button key={slot} className={time===slot?"selected":""} onClick={()=>setTime(slot)}>{slot}</button>):<p>Nenhum horário futuro disponível nesta data.</p>}</div>}

      {ready&&<div className="mobile-booking-summary"><small>CONFIRA SEU PEDIDO</small><h3>{service?.name}</h3><div><span>Data<b>{formattedDate}</b></span>{mode==="schedule"&&<span>Horário<b>{time}</b></span>}<span>Valor<b>{service?price(service.priceCents):""}</b></span><span>Profissional<b>{selectedCollaborator?.name||"Conforme disponibilidade"}</b></span></div><p>{mode==="schedule"?"O horário será confirmado pelo Yuri no WhatsApp.":"Este pedido apenas informa o dia da visita e não reserva horário."}</p></div>}

      {error&&<p className="mobile-booking-error">{error}</p>}
      {ready?<a className="mobile-whatsapp-button" href={`https://wa.me/5562981007636?text=${message}`} target="_blank" rel="noreferrer">Enviar pedido no WhatsApp <span>→</span></a>:<button className="mobile-whatsapp-button disabled" disabled>Selecione os dados acima</button>}
    </>}
  </section>;
}
