import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const MODEL="gpt-5.6-luna";

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  if(!(req.headers.get("authorization")||"").startsWith("Bearer "))return json({error:"Authentification requise."},401);

  const key=Deno.env.get("OPENAI_API_KEY");
  if(!key)return json({error:"OPENAI_API_KEY manquante dans Supabase."},500);

  try{
    const body=await req.json();
    const products=Array.isArray(body.products)?body.products:[];
    const stats=body.stats||{};
    const shop=body.shop||{};
    const prompt=`Tu es l'assistant commercial de PJD Maker. Analyse uniquement les données réelles fournies et donne des recommandations concrètes, prudentes et actionnables. Ne fabrique aucune statistique et distingue les faits des suggestions.

Boutique: ${JSON.stringify(shop)}
Statistiques catalogue: ${JSON.stringify(stats)}
Produits: ${JSON.stringify(products).slice(0,30000)}

Retourne UNIQUEMENT un JSON valide avec:
score (0-100), priority (string), actions (array de 3 à 6 objets {title,reason,action}), price_suggestions (array {product,suggestion}), seven_day_plan (string).`;

    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:MODEL,
        input:[
          {role:"system",content:[{type:"input_text",text:"Tu es un consultant e-commerce francophone. Retourne du JSON strict et n'invente aucune donnée."}]},
          {role:"user",content:[{type:"input_text",text:prompt}]}
        ],
        max_output_tokens:1800
      })
    });

    const raw=await response.text();
    let data:any;
    try{data=JSON.parse(raw)}catch{data={raw}};
    if(!response.ok)return json({error:`OpenAI: ${response.status}`,details:data?.error?.message||data},response.status);

    const text=String(data?.output_text||"").trim();
    if(!text)throw new Error("OpenAI n'a retourné aucun contenu.");

    const clean=text.replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`$/,"").trim();
    let result:any;
    try{result=JSON.parse(clean)}catch{
      const match=clean.match(/\{[\s\S]*\}/);
      if(!match)throw new Error("Réponse IA invalide.");
      result=JSON.parse(match[0]);
    }
    return json({ok:true,result,model:data?.model||MODEL});
  }catch(e){
    return json({error:e instanceof Error?e.message:"Erreur IA"},500);
  }
});