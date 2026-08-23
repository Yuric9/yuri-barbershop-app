import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { products, profiles, transactions } from "../../../db/schema";
import { productOrderItems, productOrders } from "../../../db/product-order-schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
}
function phoneKey(value:string){return value.replace(/\D/g,"")}

export async function GET() {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Não autorizado"},{status:401});
  if(user.role!=="admin") return Response.json({error:"Acesso restrito ao administrador"},{status:403});
  const db=getDb();
  const orders=await db.select().from(productOrders).where(eq(productOrders.status,"Pendente")).orderBy(desc(productOrders.id));
  const ids=orders.map(order=>order.id);
  const items=ids.length?await db.select().from(productOrderItems).where(inArray(productOrderItems.orderId,ids)):[];
  return Response.json({orders:orders.map(order=>({...order,amountCents:order.totalCents,date:order.createdAt.slice(0,10),items:items.filter(item=>item.orderId===order.id).map(item=>({id:item.productId,quantity:item.quantity,name:item.productName,priceCents:item.priceCents}))}))},{headers:{"cache-control":"no-store"}});
}

export async function POST(request:Request){
  const db=getDb();
  const user=await getChatGPTUser();
  const body=(await request.json()) as Record<string,unknown>;
  const action=String(body.action||"");
  const now=new Date().toISOString();

  if(action==="create"){
    const raw=Array.isArray(body.items)?body.items.slice(0,20):[];
    const items=raw.map(item=>{const value=item&&typeof item==="object"?item as Record<string,unknown>:{};return{id:Number(value.id||0),quantity:Math.max(1,Math.floor(Number(value.quantity||1)))}}).filter(item=>item.id>0&&item.quantity>0);
    if(!items.length) return Response.json({error:"Escolha pelo menos um produto."},{status:400});
    const ids=[...new Set(items.map(item=>item.id))];
    const rows=await db.select().from(products).where(and(inArray(products.id,ids),eq(products.active,true)));
    const byId=new Map(rows.map(row=>[row.id,row]));
    let totalCents=0;const savedItems:Array<{id:number;quantity:number;name:string;priceCents:number}>=[];
    for(const item of items){const product=byId.get(item.id);if(!product)return Response.json({error:"Um produto não está mais disponível."},{status:409});if(item.quantity>Number(product.stock))return Response.json({error:`Estoque insuficiente para ${product.name}.`},{status:409});totalCents+=product.priceCents*item.quantity;savedItems.push({id:product.id,quantity:item.quantity,name:product.name,priceCents:product.priceCents});}

    let clientEmail=user?.email||"";let clientName=String(body.clientName||user?.displayName||"").trim();const phone=String(body.phone||"").trim();const birthDate=String(body.birthDate||"").trim();
    if(user){const [profile]=await db.select().from(profiles).where(eq(profiles.email,user.email)).limit(1);clientName=clientName||profile?.name||user.displayName;if(profile&&phone)await db.update(profiles).set({name:clientName,phone,birthDate:birthDate||profile.birthDate}).where(eq(profiles.email,user.email));else if(!profile)await db.insert(profiles).values({email:user.email,name:clientName||user.displayName,phone,birthDate,createdAt:now});}
    else {const key=phoneKey(phone);if(!clientName||key.length<8)return Response.json({error:"Informe nome e telefone para concluir o pedido."},{status:400});clientEmail=`cliente-${key}@cadastro.local`;await db.insert(profiles).values({email:clientEmail,name:clientName,phone,birthDate,createdAt:now}).onConflictDoUpdate({target:profiles.email,set:{name:clientName,phone,birthDate}});}
    const [created]=await db.insert(productOrders).values({clientEmail,clientName:clientName||"Cliente",phone,status:"Pendente",totalCents,paymentMethod:"",createdAt:now,completedAt:""}).returning();
    await db.insert(productOrderItems).values(savedItems.map(item=>({orderId:created.id,productId:item.id,productName:item.name,quantity:item.quantity,priceCents:item.priceCents})));
    return Response.json({ok:true,order:{...created,amountCents:created.totalCents,items:savedItems}});
  }

  if(!user) return Response.json({error:"Não autorizado"},{status:401});
  if(user.role!=="admin") return Response.json({error:"Acesso restrito ao administrador"},{status:403});
  const id=Number(body.id||0);const [order]=await db.select().from(productOrders).where(and(eq(productOrders.id,id),eq(productOrders.status,"Pendente"))).limit(1);if(!order)return Response.json({error:"Pedido não encontrado ou já finalizado."},{status:404});
  if(action==="cancel"){await db.update(productOrders).set({status:"Cancelado",completedAt:now}).where(eq(productOrders.id,id));return Response.json({ok:true});}
  if(action!=="finalize")return Response.json({error:"Ação inválida."},{status:400});
  const items=await db.select().from(productOrderItems).where(eq(productOrderItems.orderId,id));if(!items.length)return Response.json({error:"Itens do pedido não encontrados."},{status:409});
  const rows=await db.select().from(products).where(inArray(products.id,items.map(item=>item.productId)));const byId=new Map(rows.map(row=>[row.id,row]));
  for(const item of items){const product=byId.get(item.productId);if(!product||Number(product.stock)<item.quantity)return Response.json({error:`Estoque insuficiente para ${item.productName}. Atualize o estoque antes de finalizar.`},{status:409});}
  for(const item of items){await db.update(products).set({stock:sql`${products.stock} - ${item.quantity}`}).where(eq(products.id,item.productId));}
  const paymentMethod=String(body.paymentMethod||"Dinheiro");const itemText=items.map(item=>`${item.quantity}x ${item.productName}`).join(", ");
  const [cashEntry]=await db.insert(transactions).values({kind:"entrada",description:`Venda de produtos — ${order.clientName}`,amountCents:order.totalCents,date:localToday(),clientEmail:order.clientEmail,clientName:order.clientName,serviceName:itemText,paymentMethod,createdAt:now}).returning();
  await db.update(productOrders).set({status:"Finalizado",paymentMethod,completedAt:now}).where(eq(productOrders.id,id));
  return Response.json({ok:true,transactionId:cashEntry.id});
}
