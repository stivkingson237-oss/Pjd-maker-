import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const MODEL="gpt-5.6-luna";

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!req.headers.get('authorization'))return json({error:'Authentification requise.'},401);
 const key=Deno.env.get('OPENAI_API_KEY');
 if(!key)return json({error:'OPENAI_API_KEY manquante dans Supabase.'},500);
 try{
  const body=await req.json();
  const image=String(body.image_data||'');
  const hints=body.hints||{};
  if(!image.startsWith('data:image/'))return json({error:'Image produit requise.'},400);
  const prompt=`Analyse cette photo de produit pour une marketplace camerounaise. Ne devine pas une marque, une matière ou une caractéristique qui n'est pas visible. Utilise les indications du vendeur comme contexte. Retourne UNIQUEMENT un JSON valide avec: title, category, description, short_description, keywords (tableau de 5 à 10 mots-clés), selling_points (tableau de 3 à 5 points), alt_text. Texte en français, naturel et vendeur sans promesse mensongère. Indications vendeur: ${JSON.stringify(hints)}`;
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:image}}]}],max_completion_tokens:900})});
  const raw=await r.text();
  let data:any;try{data=JSON.parse(raw)}catch{data={raw}};
  if(!r.ok)return json({error:`OpenAI: ${r.status}`,details:data},502);
  const text=data?.choices?.[0]?.message?.content||'';
  const clean=text.replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  let result;try{result=JSON.parse(clean)}catch{result={title:hints.title||'Produit',category:hints.category||'Autre',description:text,short_description:text.slice(0,180),keywords:[],selling_points:[],alt_text:hints.title||'Photo du produit'}}
  return json({ok:true,result,model:data?.model||MODEL});
 }catch(e){return json({error:e instanceof Error?e.message:'Erreur IA'},500)}
});