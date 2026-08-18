"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id:number;
  name:string;
  description?:string;
  price:number;
  priceCents?:number;
  stock:number;
  imageKey?:string;
  featured?:boolean;
  showOnLogin?:boolean;
};

type Viewer = { src:string; title:string } | null;

function storedImage(key?:string){ return key ? `/api/upload?key=${encodeURIComponent(key)}` : ""; }

export default function ProductExperience(){
  const [viewer,setViewer]=useState<Viewer>(null);
  const [scale,setScale]=useState(1);
  const [products,setProducts]=useState<Product[]>([]);
  const [editing,setEditing]=useState<Product|null>(null);
  const [form,setForm]=useState({name:"",description:"",price:"",stock:"",featured:false,showOnLogin:false});
  const [file,setFile]=useState<File|null>(null);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const pinchStart=useRef<{distance:number;scale:number}|null>(null);

  const productByName=useMemo(()=>new Map(products.map(p=>[p.name.trim().toLocaleLowerCase("pt-BR"),p])),[products]);

  async function loadProducts(){
    try{
      const response=await fetch("/api/data",{cache:"no-store"});
      if(!response.ok)return;
      const data=await response.json();
      if(data?.isAdmin&&Array.isArray(data.products))setProducts(data.products);
    }catch{}
  }

  function openEdit(product:Product){
    setEditing(product);
    setForm({
      name:product.name||"",
      description:product.description||"",
      price:String((product.priceCents ?? Math.round(Number(product.price||0)*100))/100),
      stock:String(product.stock ?? 0),
      featured:product.featured===true,
      showOnLogin:product.showOnLogin===true,
    });
    setFile(null);setMessage("");
  }

  async function uploadImage(file:File){
    const data=new FormData();data.append("file",file,file.name);
    const response=await fetch("/api/upload",{method:"POST",body:data});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||"Não foi possível enviar a imagem.");
    return String(result.key||result.imageKey||"");
  }

  async function saveEdit(){
    if(!editing)return;
    setSaving(true);setMessage("");
    try{
      let imageKey=editing.imageKey||"";
      if(file)imageKey=await uploadImage(file);
      const response=await fetch("/api/product-edit",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({id:editing.id,...form,price:Number(form.price),stock:Number(form.stock),imageKey}),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Não foi possível salvar o produto.");
      setMessage("Produto atualizado com sucesso.");
      await loadProducts();
      window.setTimeout(()=>window.location.reload(),350);
    }catch(error:any){setMessage(error?.message||"Não foi possível salvar o produto.");}
    finally{setSaving(false);}
  }

  useEffect(()=>{loadProducts();},[]);

  useEffect(()=>{
    function enhance(){
      document.querySelectorAll<HTMLElement>(".shop-image").forEach((host)=>{
        const img=host.querySelector<HTMLImageElement>("img");
        if(!img||host.dataset.productZoomReady==="true")return;
        host.dataset.productZoomReady="true";
        host.classList.add("product-zoom-trigger");
        host.setAttribute("role","button");host.setAttribute("tabindex","0");
        host.setAttribute("aria-label",`Ampliar imagem de ${img.alt||"produto"}`);
        const badge=document.createElement("span");badge.className="product-zoom-badge";badge.textContent="⌕";badge.setAttribute("aria-hidden","true");host.appendChild(badge);
      });

      document.querySelectorAll<HTMLElement>(".product-admin-page tbody tr").forEach((row)=>{
        if(row.dataset.productEditReady==="true")return;
        const name=row.querySelector("td strong")?.textContent?.trim();
        if(!name)return;
        const product=productByName.get(name.toLocaleLowerCase("pt-BR"));
        if(!product)return;
        row.dataset.productEditReady="true";
        const cell=row.lastElementChild as HTMLElement|null;
        if(!cell)return;
        const button=document.createElement("button");
        button.type="button";button.className="product-edit-button";button.textContent="Editar produto";
        button.addEventListener("click",()=>openEdit(product));
        cell.appendChild(button);
      });
    }

    function click(event:MouseEvent){
      const target=event.target instanceof Element?event.target.closest(".product-zoom-trigger") as HTMLElement|null:null;
      if(!target)return;
      const img=target.querySelector<HTMLImageElement>("img");if(!img)return;
      setScale(1);setViewer({src:img.src,title:img.alt||"Produto"});
    }
    function key(event:KeyboardEvent){
      if((event.key==="Enter"||event.key===" ")&&event.target instanceof Element&&event.target.closest(".product-zoom-trigger")){
        event.preventDefault();const host=event.target.closest(".product-zoom-trigger") as HTMLElement;const img=host.querySelector<HTMLImageElement>("img");if(img){setScale(1);setViewer({src:img.src,title:img.alt||"Produto"});}
      }
    }
    enhance();const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener("click",click);document.addEventListener("keydown",key);
    return()=>{observer.disconnect();document.removeEventListener("click",click);document.removeEventListener("keydown",key)};
  },[productByName]);

  useEffect(()=>{if(!viewer&&!editing)return;const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=old};},[viewer,editing]);

  function touchStart(e:React.TouchEvent){
    if(e.touches.length!==2){pinchStart.current=null;return;}
    const [a,b]=[e.touches[0],e.touches[1]];
    pinchStart.current={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),scale};
  }
  function touchMove(e:React.TouchEvent){
    if(e.touches.length!==2||!pinchStart.current)return;
    const [a,b]=[e.touches[0],e.touches[1]];
    const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    const next=Math.min(4,Math.max(1,pinchStart.current.scale*(distance/pinchStart.current.distance)));
    setScale(next);
  }

  return <>
    {viewer&&<div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`Imagem ampliada de ${viewer.title}`} onClick={()=>setViewer(null)}>
      <button className="product-lightbox-close" onClick={()=>setViewer(null)} aria-label="Fechar">×</button>
      <div className="product-lightbox-stage" onClick={e=>e.stopPropagation()} onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={()=>{pinchStart.current=null}} onWheel={e=>{e.preventDefault();setScale(s=>Math.min(4,Math.max(1,s+(e.deltaY<0?.2:-.2))))}}>
        <img src={viewer.src} alt={viewer.title} style={{transform:`scale(${scale})`}}/>
      </div>
      <div className="product-zoom-controls" onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setScale(s=>Math.max(1,s-.25))} aria-label="Diminuir zoom">−</button>
        <span>{Math.round(scale*100)}%</span>
        <button onClick={()=>setScale(s=>Math.min(4,s+.25))} aria-label="Aumentar zoom">+</button>
        <button onClick={()=>setScale(1)}>Ajustar</button>
      </div>
      <p className="product-zoom-hint">Toque com dois dedos para ampliar. No computador, use a roda do mouse ou os controles.</p>
    </div>}

    {editing&&<div className="product-edit-overlay" role="dialog" aria-modal="true" aria-label={`Editar ${editing.name}`} onClick={()=>setEditing(null)}>
      <div className="product-edit-modal" onClick={e=>e.stopPropagation()}>
        <div className="product-edit-head"><div><small>GESTÃO DE PRODUTO</small><h2>Editar produto</h2></div><button onClick={()=>setEditing(null)} aria-label="Fechar">×</button></div>
        <div className="product-edit-preview">{(file||editing.imageKey)&&<img src={file?URL.createObjectURL(file):storedImage(editing.imageKey)} alt="Pré-visualização do produto"/>}</div>
        <div className="product-edit-grid">
          <label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Preço (R$)<input type="number" min="0.01" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
          <label>Estoque<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label>
          <label className="product-edit-description">Descrição<textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <label className="product-edit-file">Trocar foto<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>Se não escolher outra foto, a atual será mantida.</small></label>
        </div>
        {message&&<p className="product-edit-message" role="status">{message}</p>}
        <div className="product-edit-actions"><button className="secondary-button" onClick={()=>setEditing(null)}>Cancelar</button><button className="primary-button" disabled={saving} onClick={saveEdit}>{saving?"Salvando...":"Salvar alterações"}</button></div>
      </div>
    </div>}
  </>;
}
