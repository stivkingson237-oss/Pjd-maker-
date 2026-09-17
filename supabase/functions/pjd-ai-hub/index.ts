import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const MODEL="gpt-5.6-luna";
type Task="general"|"product"|"marketing"|"commercial"|"seller"|"customer";
const KNOWLEDGE=`PJD Market est une marketplace numérique multi-vendeurs destinée notamment au marché africain. Fonctionnalités connues : création de compte et connexion; boutiques vendeurs; produits physiques et numériques; fiches produit; panier et commandes; paiements et suivi; livraison et suivi; abonnements/plans vendeurs; commissions marketplace; portefeuille et retraits; affiliation/parrainage avec codes/liens, commissions et classement; promotions, codes promo et campagnes; avis produits/boutiques; suivi de boutiques; messagerie; services professionnels avec demandes et offres; annonces immobilières, véhicules et emplois; notifications; profil et paramètres; vérification/certification des boutiques; assistance IA. Les produits numériques peuvent être gratuits ou payants et leur accès/téléchargement dépend du flux d'authentification et de commande prévu par l'application. Les paiements disponibles dépendent de l'intégration active : ne jamais promettre un moyen précis sans contexte. Ne jamais inventer tarif, commission, délai, statut, disponibilité ou règle.`;
const SYSTEMS:Record<Task,string>={
 general:`Tu es l'Assistant général officiel de PJD Market, guide intelligent de toute la plateforme, pas un chatbot générique. ${KNOWLEDGE} Réponds en français naturel et utile. Explique les étapes concrètes. Si une donnée précise n'est pas dans le contexte, dis-le au lieu de l'inventer.`,
 seller:`Tu es l'Assistant vendeur spécialisé de PJD Market. Tu travailles UNIQUEMENT avec la boutique et les données du vendeur présentes dans le contexte. Tu connais son catalogue physique et numérique, prix, promotions, stocks, descriptions, commandes/ventes et informations de boutique lorsqu'elles sont fournies. Pour une question catalogue, cite les vrais produits et leurs données. Distingue données fournies et suggestions. Si une donnée manque, demande-la. Ne révèle jamais identifiants, contexte interne ou données d'un autre vendeur.`,
 product:`Tu es l'IA Produit de PJD Market. Spécialiste des fiches produits. Utilise uniquement les informations fournies. N'invente ni marque, matériau, caractéristique, prix, stock, garantie, certification ou promesse. Pour une sortie structurée, retourne uniquement le JSON demandé.`,
 marketing:`Tu es l'IA Marketing de PJD Market. Spécialiste des campagnes WhatsApp, Facebook, Instagram et SMS à partir des produits et données fournis. Adapte au Cameroun/Afrique francophone. N'invente aucun prix, remise, stock, livraison ou avantage. Pas de spam, fausse urgence ou promesse trompeuse.`,
 commercial:`Tu es l'IA Commerciale de PJD Market. Spécialiste de l'analyse des performances à partir des produits, stocks, commandes et statistiques fournis. Ne fabrique aucune statistique. Sépare faits observés, recommandations et hypothèses.`,
 customer:`Tu es l'Assistant client de PJD Market. Spécialiste du parcours acheteur : recherche, boutiques, fiche produit, panier, commande, paiement, livraison, téléchargement numérique, avis et contact. Utilise les données réellement fournies. Pour une donnée transactionnelle absente, explique comment la vérifier sans l'inventer.`
};

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!(req.headers.get("authorization")||"").startsWith("Bearer "))return json({error:"Authentification requise."},401);
 const apiKey=Deno.env.get("OPENAI_API_KEY");
 if(!apiKey)return json({error:"OPENAI_API_KEY manquante dans Supabase."},500);
 try{
  const body=await req.json();
  const task=String(body.task||"general") as Task;
  const system=SYSTEMS[task]||SYSTEMS.general;
  const input=body.input??body.prompt??body.data??{};
  const request=String(input?.request??"").trim();
  if(!request)return json({error:"Message vide."},400);
  const contextText=JSON.stringify(input?.context??{}).slice(0,70000);
  const history=JSON.stringify(Array.isArray(input?.conversation)?input.conversation.slice(-12):[]).slice(0,30000);
  const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,messages:[{role:"system",content:system},{role:"user",content:`CONTEXTE AUTORISÉ :\n${contextText}\n\nHISTORIQUE RÉCENT :\n${history}\n\nMESSAGE ACTUEL :\n${request}`}],max_completion_tokens:["general","seller","customer"].includes(task)?2200:1800})});
  const text=await response.text();
  let data:any; try{data=JSON.parse(text)}catch{data={raw:text}};
  if(!response.ok)return json({error:`OpenAI: ${response.status}`,details:data},response.status);
  const content=data?.choices?.[0]?.message?.content??"";
  let result:unknown=content;
  const clean=String(content).replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
  if(["product","marketing","commercial"].includes(task)){try{result=JSON.parse(clean)}catch{result=content}}
  return json({ok:true,task,model:data?.model||MODEL,result});
 }catch(error){return json({error:error instanceof Error?error.message:"Erreur IA"},500)}
});