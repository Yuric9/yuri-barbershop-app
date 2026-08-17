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

type Step = 1 | 2 | 3 | 4;

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

  useEffect(()=>{
    if(!target)return;
    const sidebar=document.querySelector(".sidebar") as HTMLElement|null;
    if(!sidebar)return;

    let returnButton=sidebar.querySelector(".mobile-return-booking") as HTMLButtonElement|null;
    if(!returnButton){
      returnButton=document.createElement("button");
      returnButton.type="button";
      returnButton.className="mobile-return-booking";
      returnButton.innerHTML="<span>←</span><strong>Voltar ao agendamento</strong>";
      returnButton.addEventListener("click",()=>{
        const menuButton=document.querySelector(".menu-button") as HTMLButtonElement|null;
        if(sidebar.classList.contains("open")) menuButton?.click();
      });
      const nav=sidebar.querySelector("nav");
      sidebar.insertBefore(returnButton,nav || sidebar.firstChild);
    }

    return()=>{
      sidebar.querySelector(".mobile-return-booking")?.remove();
    };
  },[target]);

  if(!target)return null;
  return createPortal(<MobileBooking/>,target);
}

function MobileBooking(){
  const [data,setData]=useState<Data>({services:[],collaborators:[],profiles:[]});
  const [loading,setLoading]=useState(true);
  const [step,setStep]=useState<Step>(1);
  const [serviceId,setServiceId]=useState(0);
  const [collaboratorId,setCollaboratorId]=useState(0);
  const [mode,setMode]=useState<"schedule"|"notice">("schedule");
  const [date,setDate]=useState("");
  const [time,setTime]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/data").then(r=>r.ok?r.json():Promise.reject()).then((json)=>{
      setData(json);
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

  function chooseService(id:number){
    setServiceId(id);
    setDate("");
    setTime("");
    setStep(2);
  }

  function chooseMode(next:"schedule"|"notice"){
    setMode(next);
    setTime("");
    setStep(3);
  }

  function chooseDate(next:string){
    setDate(next);
    setTime("");
    if(next>=localDateKey() && mode==="notice") setStep(4);
  }

  function chooseTime(next:string){
    setTime(next);
    setStep(4);
  }

  function previous(){
    setStep((current)=>Math.max(1,current-1) as Step);
  }

  return <section className="mobile-booking-app" aria-label="Agendamento rápido">
    <header className="mobile-flow-header">
      <div>
        <small>AGENDAMENTO</small>
        <strong>{step===1?"Escolha o serviço":step===2?"Como deseja ser atendido?":step===3?(mode==="schedule"?"Escolha data e horário":"Escolha o dia da visita"):"Confirme seu pedido"}</strong>
      </div>
      {step>1&&<button type="button" onClick={previous} aria-label="Voltar uma etapa">← Voltar</button>}
    </header>

    <div className="mobile-progress" aria-label={`Etapa ${step} de 4`}>
      {[1,2,3,4].map(n=><span key={n} className={step>=n?"active":""}><i>{n}</i></span>)}
    </div>

    {loading?<div className="mobile-booking-loading">Carregando serviços...</div>:<div className="mobile-stage-wrap">
      {step===1&&<div className="mobile-stage mobile-stage-services">
        <div className="mobile-stage-intro"><h2>O que vamos fazer hoje?</h2><p>Toque em um serviço para continuar.</p></div>
        <div className="mobile-service-grid">
          {data.services.map(s=><button key={s.id} className={serviceId===s.id?"selected":""} onClick={()=>chooseService(s.id)}><span>{s.name}</span><strong>{price(s.priceCents)}</strong><small>{s.durationMin} min <b>→</b></small></button>)}
        </div>
      </div>}

      {step===2&&<div className="mobile-stage">
        <div className="mobile-stage-intro"><h2>{service?.name}</h2><p>{service?`${price(service.priceCents)} · ${service.durationMin} min`:""}</p></div>
        {collaborators.length>1&&<div className="mobile-professional-block"><label>Profissional</label><div className="mobile-choice-row"><button className={!collaboratorId?"selected":""} onClick={()=>setCollaboratorId(0)}>Qualquer profissional</button>{collaborators.map(c=><button key={c.id} className={collaboratorId===c.id?"selected":""} onClick={()=>setCollaboratorId(c.id)}>{c.name}</button>)}</div></div>}
        <div className="mobile-mode-stack">
          <button onClick={()=>chooseMode("schedule")}><span>◷</span><div><strong>Agendar um horário</strong><small>Escolher dia e hora disponíveis</small></div><b>→</b></button>
          <button onClick={()=>chooseMode("notice")}><span>↗</span><div><strong>Só avisar o dia</strong><small>Sem reservar um horário específico</small></div><b>→</b></button>
        </div>
      </div>}

      {step===3&&<div className="mobile-stage">
        <div className="mobile-stage-intro"><h2>{mode==="schedule"?"Quando você quer vir?":"Qual dia você pretende vir?"}</h2><p>Datas anteriores a hoje não podem ser selecionadas.</p></div>
        <label className="mobile-date-field">Data<input type="date" min={localDateKey()} value={date} onChange={e=>chooseDate(e.target.value)}/></label>
        {mode==="schedule"&&validDate&&<>
          <div className="mobile-time-label"><strong>Horários disponíveis</strong><small>Toque em um horário para continuar</small></div>
          <div className="mobile-time-grid">{times.length?times.map(slot=><button key={slot} className={time===slot?"selected":""} onClick={()=>chooseTime(slot)}>{slot}</button>):<p>Nenhum horário futuro disponível nesta data.</p>}</div>
        </>}
      </div>}

      {step===4&&ready&&<div className="mobile-stage">
        <div className="mobile-booking-summary">
          <small>RESUMO DO PEDIDO</small>
          <h3>{service?.name}</h3>
          <div><span>Data<b>{formattedDate}</b></span>{mode==="schedule"&&<span>Horário<b>{time}</b></span>}<span>Valor<b>{service?price(service.priceCents):""}</b></span><span>Profissional<b>{selectedCollaborator?.name||"Conforme disponibilidade"}</b></span></div>
          <p>{mode==="schedule"?"O horário será confirmado pelo Yuri no WhatsApp.":"Este pedido apenas informa o dia da visita e não reserva horário."}</p>
        </div>
        <button className="mobile-edit-choice" type="button" onClick={()=>setStep(1)}>Alterar escolhas</button>
        <a className="mobile-whatsapp-button" href={`https://wa.me/5562981007636?text=${message}`} target="_blank" rel="noreferrer">Enviar pedido no WhatsApp <span>→</span></a>
      </div>}

      {step===4&&!ready&&<div className="mobile-stage"><p className="mobile-booking-error">Faltam dados para concluir. Volte uma etapa e confira sua escolha.</p></div>}
      {error&&<p className="mobile-booking-error">{error}</p>}
    </div>}
  </section>;
}
