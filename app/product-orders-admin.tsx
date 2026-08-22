"use client";

import { useEffect,useState } from "react";
import { createPortal } from "react-dom";

type OrderItem={id:number;quantity:number;name:string;priceCents:number};
type Order={id:number;clientName:string;clientEmail:string;amountCents:number;date:string;items:OrderItem[]};
function norm(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function money(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(cents)||0)/100)}
function formatDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"):value}

export default function ProductOrdersAdmin(){
  const[target,setTarget]=useState<HTMLElement|null>(null);
  useEffect(()=>{const sync=()=>{const content=document.querySelector<HTMLElement>(".app-content");const title=content?.querySelector(".app-header h1")?.textContent||"";if(content&&norm(title)==="produtos"){let mount=content.querySelector<HTMLElement>(".product-orders-admin-mount");if(!mount){mount=document.createElement("div");mount.className="product-orders-admin-mount";content.querySelector(".app-header")?.insertAdjacentElement("afterend",mount)}setTarget(mount)}else setTarget(null)};sync();const o=new MutationObserver(sync);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect()},[]);
  return target?createPortal(<Panel/>,target):null;
}
function Panel(){
  const[orders,setOrders]=useState<Order[]>([]);const[loading,setLoading]=useState(true);const[message,setMessage]=useState("");const[payment,setPayment]=useState<Record<number,string>>({});
  async function load(){setLoading(true);try{const r=await fetch("/api/product-orders",{cache:"no-store"});const b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível carregar pedidos.");setOrders(Array.isArray(b.orders)?b.orders:[])}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível carregar pedidos.")}finally{setLoading(false)}}useEffect(()=>{void load()},[]);
  async function act(order:Order,action:"finalize"|"cancel"){if(action==="finalize"&&!window.confirm(`Finalizar o pedido #${order.id} de ${order.clientName} por ${money(order.amountCents)}? O estoque será baixado agora.`))return;const r=await fetch("/api/product-orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,id:order.id,paymentMethod:payment[order.id]||"Dinheiro"})});const b=await r.json().catch(()=>({}));if(!r.ok){setMessage(b.error||"Não foi possível atualizar o pedido.");return}setMessage(action==="finalize"?"Pedido finalizado, estoque atualizado e venda lançada no caixa.":"Pedido cancelado sem alterar o estoque.");await load()}
  if(loading)return <section className="product-orders-admin"><p>Carregando pedidos...</p></section>;
  return <section className="product-orders-admin"><div className="product-orders-head"><div><small>PEDIDOS DE PRODUTOS</small><h2>Pedidos pendentes</h2><p>O estoque só baixa quando você finalizar o pedido.</p></div><span>{orders.length} pendente{orders.length===1?"":"s"}</span></div>{message&&<p className="product-orders-message">{message}</p>}{orders.length?<div className="product-orders-grid">{orders.map(order=><article key={order.id}><header><div><small>Pedido #{order.id}</small><strong>{order.clientName||"Cliente"}</strong><span>{formatDate(order.date)}</span></div><b>{money(order.amountCents)}</b></header><div className="product-order-items">{order.items.map(item=><div key={`${order.id}-${item.id}`}><span>{item.quantity}x {item.name}</span><b>{money(item.priceCents*item.quantity)}</b></div>)}</div><div className="product-order-actions"><select value={payment[order.id]||"Dinheiro"} onChange={e=>setPayment({...payment,[order.id]:e.target.value})}><option>Dinheiro</option><option>Pix</option><option>Cartão</option></select><button className="cancel" onClick={()=>void act(order,"cancel")}>Cancelar</button><button className="finish" onClick={()=>void act(order,"finalize")}>Finalizar pedido</button></div></article>)}</div>:<div className="product-orders-empty">Nenhum pedido de produto aguardando atendimento.</div>}</section>
}
