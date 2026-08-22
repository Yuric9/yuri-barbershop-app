"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Transaction = {
  id:number; kind:string; description:string; amountCents:number; date:string;
  clientEmail?:string; clientName?:string; serviceId?:number|null; serviceName?:string;
  paymentMethod?:string;
};
type Service = { id:number; name:string; priceCents:number };
type Client = { email:string; name:string; phone?:string };

type Data = { transactions:Transaction[]; services:Service[]; clients:Client[] };

const EMPTY:Data={transactions:[],services:[],clients:[]};
const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function localDateKey(date=new Date()){
  const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,"0");const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function money(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(cents)||0)/100)}
function formatDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return value;return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")}
function norm(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}

export default function ReportsV2(){
  const [target,setTarget]=useState<HTMLElement|null>(null);
  useEffect(()=>{
    let current:HTMLElement|null=null;
    const sync=()=>{
      const content=document.querySelector<HTMLElement>(".app-content");
      const title=content?.querySelector(".app-header h1")?.textContent||"";
      const active=Boolean(content&&norm(title)==="relatorios");
      if(active&&content){
        content.classList.add("reports-v2-active");
        let mount=content.querySelector<HTMLElement>(".reports-v2-mount");
        if(!mount){mount=document.createElement("div");mount.className="reports-v2-mount";content.querySelector(".app-header")?.insertAdjacentElement("afterend",mount);}
        if(current!==mount){current=mount;setTarget(mount);}
      }else{
        content?.classList.remove("reports-v2-active");
        current=null;setTarget(null);
      }
    };
    sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>{observer.disconnect();document.querySelector(".app-content")?.classList.remove("reports-v2-active");};
  },[]);
  return target?createPortal(<ReportsPanel/>,target):null;
}

function ReportsPanel(){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth()+1);
  const [data,setData]=useState<Data>(EMPTY);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [mode,setMode]=useState<"day"|"month">("day");
  const [form,setForm]=useState({date:localDateKey(),month:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`,kind:"entrada",amount:"",description:"",serviceId:"",clientEmail:"",paymentMethod:"Histórico"});

  const load=useCallback(async()=>{
    setLoading(true);setMessage("");
    try{const response=await fetch(`/api/reports-v2?year=${year}`,{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error||"Não foi possível carregar os relatórios.");setData({transactions:Array.isArray(body.transactions)?body.transactions:[],services:Array.isArray(body.services)?body.services:[],clients:Array.isArray(body.clients)?body.clients:[]});}
    catch(e){setMessage(e instanceof Error?e.message:"Não foi possível carregar os relatórios.");}
    finally{setLoading(false)}
  },[year]);
  useEffect(()=>{void load()},[load]);

  const prefix=`${year}-${String(month).padStart(2,"0")}`;
  const rows=useMemo(()=>data.transactions.filter(t=>t.date.startsWith(prefix)).sort((a,b)=>`${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`)),[data.transactions,prefix]);
  const entries=rows.filter(t=>t.kind==="entrada").reduce((s,t)=>s+t.amountCents,0);
  const expenses=rows.filter(t=>t.kind==="despesa").reduce((s,t)=>s+t.amountCents,0);
  const yearly=useMemo(()=>MONTHS.map((name,index)=>{const p=`${year}-${String(index+1).padStart(2,"0")}`;const r=data.transactions.filter(t=>t.date.startsWith(p));const e=r.filter(t=>t.kind==="entrada").reduce((s,t)=>s+t.amountCents,0);const x=r.filter(t=>t.kind==="despesa").reduce((s,t)=>s+t.amountCents,0);return{name,index:index+1,entries:e,expenses:x,balance:e-x}}),[data.transactions,year]);
  const yearEntries=yearly.reduce((s,m)=>s+m.entries,0);const yearExpenses=yearly.reduce((s,m)=>s+m.expenses,0);

  function resetForm(){setEditingId(null);setMode("day");setForm({date:localDateKey(),month:`${year}-${String(month).padStart(2,"0")}`,kind:"entrada",amount:"",description:"",serviceId:"",clientEmail:"",paymentMethod:"Histórico"});setMessage("")}
  function startNew(){resetForm();setOpen(true)}
  function startEdit(item:Transaction){setEditingId(item.id);setMode("day");setForm({date:item.date,month:item.date.slice(0,7),kind:item.kind==="despesa"?"despesa":"entrada",amount:String((item.amountCents||0)/100),description:item.description||"",serviceId:item.serviceId?String(item.serviceId):"",clientEmail:item.clientEmail||"",paymentMethod:item.paymentMethod||"Histórico"});setOpen(true);window.scrollTo({top:0,behavior:"smooth"})}
  async function save(){
    setMessage("");const amount=Number(form.amount);if(!Number.isFinite(amount)||amount<=0){setMessage("Informe um valor maior que zero.");return;}
    const payload=editingId?{action:"update",id:editingId,date:form.date,kind:form.kind,amount,description:form.description,serviceId:form.serviceId||undefined,clientEmail:form.clientEmail||undefined,paymentMethod:form.paymentMethod}:{action:"create",mode,kind:form.kind,amount,date:form.date,month:form.month,description:form.description,serviceId:form.serviceId||undefined,clientEmail:form.clientEmail||undefined,paymentMethod:form.paymentMethod};
    const response=await fetch("/api/reports-v2",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));if(!response.ok){setMessage(body.error||"Não foi possível salvar.");return;}
    const reference=editingId?form.date:(mode==="month"?`${form.month}-01`:form.date);setYear(Number(reference.slice(0,4)));setMonth(Number(reference.slice(5,7)));setMessage(editingId?"Lançamento atualizado com sucesso.":"Lançamento salvo com sucesso.");setOpen(false);setEditingId(null);await load();
  }

  const years=Array.from({length:8},(_,i)=>now.getFullYear()-6+i);
  return <section className="reports-v2">
    <header className="reports-v2-head"><div><small>GESTÃO FINANCEIRA</small><h2>Relatórios</h2><p>Cadastre seu histórico, acompanhe os meses e corrija lançamentos quando precisar.</p></div><button type="button" onClick={startNew}>+ Novo lançamento</button></header>
    <div className="reports-v2-filters"><label>Mês<select value={month} onChange={e=>setMonth(Number(e.target.value))}>{MONTHS.map((name,i)=><option value={i+1} key={name}>{name}</option>)}</select></label><label>Ano<select value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label></div>
    {message&&<p className="reports-v2-message">{message}</p>}
    {open&&<div className="reports-v2-form"><div className="reports-v2-form-title"><div><small>{editingId?"CORREÇÃO":"NOVO REGISTRO"}</small><h3>{editingId?"Editar lançamento":"Lançar dados anteriores"}</h3></div><button type="button" onClick={()=>{setOpen(false);resetForm()}}>×</button></div>{!editingId&&<label>Tipo de período<select value={mode} onChange={e=>setMode(e.target.value as "day"|"month")}><option value="day">Dia específico</option><option value="month">Mês fechado</option></select></label>}{mode==="month"&&!editingId?<label>Mês de referência<input type="month" value={form.month} max={localDateKey().slice(0,7)} onChange={e=>setForm({...form,month:e.target.value})}/></label>:<label>Data<input type="date" value={form.date} max={localDateKey()} onChange={e=>setForm({...form,date:e.target.value})}/></label>}<label>Movimento<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="entrada">Entrada / faturamento</option><option value="despesa">Saída / despesa</option></select></label><label>Valor (R$)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0,00"/></label><label>Serviço (opcional)<select value={form.serviceId} onChange={e=>setForm({...form,serviceId:e.target.value})}><option value="">Sem vínculo</option>{data.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Cliente (opcional)<select value={form.clientEmail} onChange={e=>setForm({...form,clientEmail:e.target.value})}><option value="">Sem vínculo</option>{data.clients.map(c=><option key={c.email} value={c.email}>{c.name}{c.phone?` — ${c.phone}`:""}</option>)}</select></label><label>Forma de pagamento<input value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} placeholder="Dinheiro, Pix..."/></label><label className="reports-v2-wide">Descrição / observação<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={mode==="month"?"Ex.: fechamento consolidado do mês":"Ex.: serviços realizados no dia"}/></label><div className="reports-v2-form-actions"><button type="button" className="secondary" onClick={()=>{setOpen(false);resetForm()}}>Cancelar</button><button type="button" onClick={()=>void save()}>{editingId?"Salvar correção":mode==="month"?"Salvar mês fechado":"Salvar dia"}</button></div></div>}
    <div className="reports-v2-metrics"><article><span>Faturamento do mês</span><strong>{money(entries)}</strong><small>{MONTHS[month-1]} de {year}</small></article><article><span>Despesas do mês</span><strong>{money(expenses)}</strong><small>Saídas registradas</small></article><article><span>Saldo do mês</span><strong>{money(entries-expenses)}</strong><small>Entradas menos saídas</small></article><article><span>Saldo do ano</span><strong>{money(yearEntries-yearExpenses)}</strong><small>{year}</small></article></div>
    <div className="reports-v2-year"><div className="reports-v2-section-title"><div><small>VISÃO ANUAL</small><h3>Resumo por mês</h3></div><strong>{money(yearEntries)} faturados</strong></div><div className="reports-v2-month-grid">{yearly.map(item=><button type="button" key={item.index} className={month===item.index?"active":""} onClick={()=>setMonth(item.index)}><span>{item.name.slice(0,3)}</span><strong>{money(item.entries)}</strong><small>Saldo {money(item.balance)}</small></button>)}</div></div>
    <div className="reports-v2-history"><div className="reports-v2-section-title"><div><small>HISTÓRICO</small><h3>Lançamentos de {MONTHS[month-1]}</h3></div><span>{rows.length} registro{rows.length===1?"":"s"}</span></div>{loading?<p className="reports-v2-empty">Carregando...</p>:rows.length?<div className="reports-v2-table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Serviço / cliente</th><th>Tipo</th><th>Valor</th><th></th></tr></thead><tbody>{rows.map(item=><tr key={item.id}><td>{formatDate(item.date)}</td><td><strong>{item.description}</strong><small>{item.paymentMethod||"—"}</small></td><td>{item.serviceName||item.clientName?<><span>{item.serviceName||"—"}</span><small>{item.clientName||""}</small></>:"—"}</td><td><span className={`reports-v2-kind ${item.kind==="despesa"?"out":"in"}`}>{item.kind==="despesa"?"Saída":"Entrada"}</span></td><td className={item.kind==="despesa"?"negative":""}>{item.kind==="despesa"?"− ":""}{money(item.amountCents)}</td><td><button type="button" className="edit" onClick={()=>startEdit(item)}>Editar</button></td></tr>)}</tbody></table></div>:<p className="reports-v2-empty">Nenhum lançamento neste mês. Você pode cadastrar um dia específico ou o fechamento mensal.</p>}</div>
  </section>
}
