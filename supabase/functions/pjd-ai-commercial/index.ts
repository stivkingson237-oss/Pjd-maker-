import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const MODEL=Deno.env.get("GEMINI_MODEL")||"gemini-3.8-flash";

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!(req.headers.get("authorization")||"").startsWith("Bearer "))return json({error:"Authentification requise."},401);
 const key=Deno.env.get("GEMINI_API_KEY");
 if(!key)return json({error:"GEMINI_API_KEY manquante dans Supabase."},500);
 try{
  const body=await req.json();
  const products=Array.isArray(body.products)?body.products:[];
  const stats=body.stats||{};
  const shop=body.shop||{};
  const prompt=`Analyse uniquement les données réelles fournies et donne des recommandations concrètes, prudentes et actionnables. Ne fabrique aucune statistique et distingue les faits des suggestions.

Boutique: ${JSON.stringify(shop)}
Statistiques catalogue: ${JSON.stringify(stats)}
Produits: ${JSON.stringify(products).slice(0,30000)}

Retourne UNIQUEMENT un JSON valide avec:
score (0-100), priority (string), actions (array de 3 à 6 objets {title,reason,action}), price_suggestions (array {product,suggestion}), seven_day_plan (string).`;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({systemInstruction:{parts:[{text:"Tu es un consultant e-commerce francophone. Retourne du JSON strict et n'invente aucune donnée."}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:1800,responseMimeType:"application/json"}})
  });
  const raw=await r.text();let data:any;try{data=JSON.parse(raw)}catch{data={raw}};
  if(!r.ok)return json({error:`Gemini: ${r.status}`,details:data?.error?.message||data},r.status);
  const text=String(data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"").trim();
  if(!text)throw new Error("Gemini n'a retourné aucun contenu.");
  let result:any;try{result=JSON.parse(text)}catch{throw new Error("Réponse IA invalide.")};
  return json({ok:true,result,model:data?.modelVersion||MODEL});
 }catch(e){return json({error:e instanceof Error?e.message:"Erreur IA"},500)}
});