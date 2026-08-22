import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointmentSlots, appointments, collaborators, products, profiles, scheduleBlocks, services } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
}
function localMinutesNow() {
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
  return Number(parts.find(p=>p.type==="hour")?.value||0)*60+Number(parts.find(p=>p.type==="minute")?.value||0);
}
function timeToMinutes(value:string){const m=/^(\d{2}):(\d{2})$/.exec(value);return m?Number(m[1])*60+Number(m[2]):Number.NaN}
function operatingWindow(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const day=new Date(`${date}T12:00:00`).getDay();return{start:day===0||day===6?8*60:18*60,end:day===0?12*60:20*60+30}}
function allowedTimes(date:string,duration:number){const w=operatingWindow(date);if(!w)return[];const out:string[]=[];for(let m=w.start;m+duration<=w.end;m+=30)out.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`);return out}
function slotsForStart(time:string,duration:number){const start=timeToMinutes(time);return Array.from({length:Math.max(1,Math.ceil(duration/30))},(_,i)=>{const m=start+i*30;return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`})}
function blockOverlaps(blockTime:string,start:string,duration:number){if(blockTime==="Dia inteiro")return true;const a=timeToMinutes(start),b=timeToMinutes(blockTime);return Number.isFinite(a)&&Number.isFinite(b)&&a<b+30&&b<a+duration}
function phoneKey(value:string){return value.replace(/\D/g,"")}

async function loadSelectedServices(db:ReturnType<typeof getDb>, ids:number[]){
  const unique=[...new Set(ids.filter(id=>id>0))].slice(0,10);if(!unique.length)return[];
  const rows=await db.select().from(services).where(and(inArray(services.id,unique),eq(services.active,true)));
  return unique.map(id=>rows.find(row=>row.id===id)).filter(Boolean) as typeof rows;
}

export async function GET(request:Request){
  const db=getDb();const user=await getChatGPTUser();const url=new URL(request.url);
  const [serviceRows,productRows,collaboratorRows]=await Promise.all([db.select().from(services).where(eq(services.active,true)),db.select().from(products).where(eq(products.active,true)),db.select().from(collaborators).where(eq(collaborators.active,true))]);
  let profile=null;if(user){const rows=await db.select().from(profiles).where(eq(profiles.email,user.email)).limit(1);profile=rows[0]||null;}
  const date=url.searchParams.get("date")||"";const ids=(url.searchParams.get("serviceIds")||"").split(",").map(Number).filter(Boolean);const collaboratorId=Number(url.searchParams.get("collaboratorId")||0);
  let occupiedTimes:string[]=[];
  if(date&&ids.length){const selected=serviceRows.filter(s=>ids.includes(s.id));const duration=selected.reduce((sum,s)=>sum+s.durationMin,0);const candidates=allowedTimes(date,duration);const [locks,blocks]=await Promise.all([db.select().from(appointmentSlots).where(eq(appointmentSlots.date,date)),db.select().from(scheduleBlocks).where(eq(scheduleBlocks.date,date))]);const resources=collaboratorId?[`barber:${collaboratorId}`]:(collaboratorRows.length?collaboratorRows.map(c=>`barber:${c.id}`):["shop"]);occupiedTimes=candidates.filter(time=>resources.every(resource=>{const id=resource.startsWith("barber:")?Number(resource.split(":")[1]):0;const blocked=blocks.some(b=>(!id||!b.collaboratorId||b.collaboratorId===id)&&blockOverlaps(b.time,time,duration));if(blocked)return true;const needed=slotsForStart(time,duration);return needed.some(slot=>locks.some(lock=>lock.resourceKey===resource&&lock.time===slot));}));}
  return Response.json({services:serviceRows,products:productRows,collaborators:collaboratorRows.map(c=>({id:c.id,name:c.name,active:c.active})),profile,occupiedTimes},{headers:{"cache-control":"no-store"}});
}

export async function POST(request:Request){
  const db=getDb();const user=await getChatGPTUser();const body=(await request.json()) as Record<string,unknown>;
  if(String(body.action||"")!=="appointment")return Response.json({error:"Ação inválida."},{status:400});
  const serviceIds=Array.isArray(body.serviceIds)?body.serviceIds.map(Number):[];const selected=await loadSelectedServices(db,serviceIds);if(!selected.length||selected.length!==new Set(serviceIds.filter((id:any)=>Number(id)>0)).size)return Response.json({error:"Escolha pelo menos um serviço válido."},{status:400});
  const date=String(body.date||""),time=String(body.time||"");const duration=selected.reduce((sum,s)=>sum+s.durationMin,0);const totalCents=selected.reduce((sum,s)=>sum+s.priceCents,0);if(!date||!time)return Response.json({error:"Escolha a data e o horário."},{status:400});if(date<localToday())return Response.json({error:"Não é possível agendar em uma data passada."},{status:400});if(!allowedTimes(date,duration).includes(time))return Response.json({error:"Os serviços escolhidos não cabem neste horário antes do fechamento."},{status:400});if(date===localToday()&&timeToMinutes(time)<=localMinutesNow())return Response.json({error:"Este horário já passou."},{status:409});
  const collaboratorRows=await db.select().from(collaborators).where(eq(collaborators.active,true));const requestedId=Number(body.collaboratorId||0);if(requestedId&&!collaboratorRows.some(c=>c.id===requestedId))return Response.json({error:"Profissional indisponível."},{status:400});
  const [locks,blocks]=await Promise.all([db.select().from(appointmentSlots).where(eq(appointmentSlots.date,date)),db.select().from(scheduleBlocks).where(eq(scheduleBlocks.date,date))]);const needed=slotsForStart(time,duration);const resources=requestedId?[`barber:${requestedId}`]:(collaboratorRows.length?collaboratorRows.map(c=>`barber:${c.id}`):["shop"]);let resourceKey="";let collaborator:typeof collaboratorRows[number]|undefined;
  for(const resource of resources){const id=resource.startsWith("barber:")?Number(resource.split(":")[1]):0;const blocked=blocks.some(b=>(!id||!b.collaboratorId||b.collaboratorId===id)&&blockOverlaps(b.time,time,duration));const occupied=needed.some(slot=>locks.some(lock=>lock.resourceKey===resource&&lock.time===slot));if(!blocked&&!occupied){resourceKey=resource;collaborator=id?collaboratorRows.find(c=>c.id===id):undefined;break;}}
  if(!resourceKey)return Response.json({error:"Este período acabou de ser reservado. Escolha outro horário."},{status:409});
  const now=new Date().toISOString();let clientEmail=user?.email||"";let clientName=String(body.clientName||user?.displayName||"").trim();const phone=String(body.phone||"").trim(),birthDate=String(body.birthDate||"").trim();
  if(user){const [profile]=await db.select().from(profiles).where(eq(profiles.email,user.email)).limit(1);clientName=clientName||profile?.name||user.displayName;if(profile&&phone)await db.update(profiles).set({name:clientName,phone,birthDate:birthDate||profile.birthDate}).where(eq(profiles.email,user.email));else if(!profile)await db.insert(profiles).values({email:user.email,name:clientName||user.displayName,phone,birthDate,createdAt:now});}
  else {const key=phoneKey(phone);if(!clientName||key.length<8)return Response.json({error:"Informe nome e telefone para concluir o agendamento."},{status:400});clientEmail=`cliente-${key}@cadastro.local`;await db.insert(profiles).values({email:clientEmail,name:clientName,phone,birthDate,createdAt:now}).onConflictDoUpdate({target:profiles.email,set:{name:clientName,phone,birthDate}});}
  const existing=(await db.select().from(appointments).where(eq(appointments.date,date))).find(a=>a.status!=="Cancelado"&&a.clientEmail===clientEmail&&a.time===time);if(existing)return Response.json({ok:true,appointment:existing,reused:true});
  const reservationId=crypto.randomUUID();try{await db.insert(appointmentSlots).values(needed.map(slot=>({date,time:slot,resourceKey,reservationId,createdAt:now})));}catch{return Response.json({error:"Este período acabou de ser reservado. Escolha outro horário."},{status:409});}
  try{const serviceName=selected.map(s=>s.name).join(" + ");const [created]=await db.insert(appointments).values({clientEmail,clientName:clientName||"Cliente",serviceId:selected[0].id,serviceName,date,time,totalCents,collaboratorId:collaborator?.id,collaboratorName:collaborator?.name||"Conforme disponibilidade",adminMessage:`Serviços: ${selected.map(s=>`${s.name} (${s.durationMin} min)`).join(", ")} · Duração total: ${duration} min`,createdAt:now}).returning();await db.update(appointmentSlots).set({appointmentId:created.id}).where(eq(appointmentSlots.reservationId,reservationId));return Response.json({ok:true,appointment:created,totalDuration:duration,totalCents});}catch(error){await db.delete(appointmentSlots).where(eq(appointmentSlots.reservationId,reservationId));throw error;}
}
