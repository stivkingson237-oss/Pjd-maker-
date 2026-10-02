import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const MODEL=Deno.env.get("GEMINI_MODEL")||"gemini-3.8-flash";

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!req.headers.get("authorization"))return json({error:"Authentification requise."},401);
 const key=Deno.env.get("GEMINI_API_KEY");
 if(!key)return json({error:"GEMINI_API_KEY manquante dans Supabase."},500);
 try{
  const body=await req.json();
  const image=String(body.image_data||"");
  const hints=body.hints||{};
  if(!image.startsWith("data:image/"))return json({error:"Image produit requise."},400);
  const match=image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
  if(!match)return json({error:"Image produit invalide."},400);
  const prompt=`Analyse cette photo de produit pour une marketplace camerounaise. Ne devine pas une marque, une matière ou une caractéristique qui n'est pas visible. Utilise les indications du vendeur comme contexte. Retourne UNIQUEMENT un JSON valide avec: title, category, description, short_description, keywords (tableau de 5 à 10 mots-clés), selling_points (tableau de 3 à 5 points), alt_text. Texte en français, naturel et vendeur sans promesse mensongère. Indications vendeur: ${JSON.stringify(hints)}`;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt},{inlineData:{mimeType:match[1],data:match[2]}}]}],generationConfig:{temperature:0.3,maxOutputTokens:1200,responseMimeType:"application/json"}})
  });
  const raw=await r.text();let data:any;try{data=JSON.parse(raw)}catch{data={raw}};
  if(!r.ok)return json({error:`Gemini: ${r.status}`,details:data?.error?.message||data},502);
  const text=String(data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"").trim();
  if(!text)throw new Error("Gemini n'a retourné aucun contenu.");
  let result;try{result=JSON.parse(text)}catch{throw new Error("Réponse IA invalide.")};
  return json({ok:true,result,model:data?.modelVersion||MODEL});
 }catch(e){return json({error:e instanceof Error?e.message:"Erreur IA"},500)}
});