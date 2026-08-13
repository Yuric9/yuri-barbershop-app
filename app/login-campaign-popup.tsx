"use client";
import { useState } from "react";

export default function LoginCampaignPopup({ campaign }: { campaign: any }) {
  const [open,setOpen]=useState(true);
  if(!open||!campaign)return null;
  const image=campaign.imageKey?`/api/upload?key=${encodeURIComponent(campaign.imageKey)}`:"";
  return <div className="campaign-popup-backdrop" role="dialog" aria-modal="true" aria-label="Campanha ativa"><div className="campaign-popup"><button className="campaign-popup-close" onClick={()=>setOpen(false)} aria-label="Fechar promoção">×</button>{image&&<img src={image} alt={campaign.title}/>}<div><small>{campaign.kind==="subscription"?"CLUBE YURI":campaign.kind==="product"?"PRODUTO EM DESTAQUE":"PROMOÇÃO ATIVA"}</small><h2>{campaign.title}</h2><p>{campaign.description}</p><a href="#acesso" onClick={()=>setOpen(false)}>Quero conhecer</a></div></div></div>;
}
