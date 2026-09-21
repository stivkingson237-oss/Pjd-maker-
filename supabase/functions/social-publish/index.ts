import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const auth=req.headers.get("authorization")||"";if(!auth.startsWith("Bearer "))return json({error:"Authentification requise."},401);
 const base=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 let jobId="";
 try{
  const meR=await fetch(`${base}/auth/v1/user`,{headers:{apikey:anon,Authorization:auth}});const me=await meR.json();if(!me?.id)throw new Error("Session invalide.");
  const body=await req.json();jobId=String(body?.job_id||"");if(!jobId)throw new Error("job_id requis.");
  const h={apikey:service,Authorization:`Bearer ${service}`};
  const jr=await fetch(`${base}/rest/v1/social_share_jobs?select=*&id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(me.id)}&limit=1`,{headers:h});const jobs=await jr.json();const job=jobs?.[0];if(!job)throw new Error("Publication introuvable.");
  if(job.status==="published")return json({ok:true,status:"published",external_post_id:job.external_post_id});
  const cr=await fetch(`${base}/rest/v1/social_connections?select=*&user_id=eq.${encodeURIComponent(me.id)}&provider=eq.${encodeURIComponent(job.provider)}&status=eq.connected&limit=1`,{headers:h});const conns=await cr.json();const conn=conns?.[0];if(!conn)throw new Error("Compte social non connecté.");
  let external="";
  if(job.provider==="facebook"){const endpoint=job.media_url?`https://graph.facebook.com/v23.0/${encodeURIComponent(conn.account_id)}/photos`:`https://graph.facebook.com/v23.0/${encodeURIComponent(conn.account_id)}/feed`;const p=new URLSearchParams({access_token:conn.access_token,message:String(job.caption||"")});if(job.media_url)p.set("url",String(job.media_url));else if(job.target_url)p.set("link",String(job.target_url));const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:p});const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||"Publication Facebook impossible.");external=d.post_id||d.id||"";}
  else if(job.provider==="instagram"){if(!job.media_url)throw new Error("Instagram exige une image publique.");const p1=new URLSearchParams({image_url:String(job.media_url),caption:String(job.caption||""),access_token:conn.access_token});const r1=await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(conn.account_id)}/media`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:p1});const c=await r1.json();if(!r1.ok)throw new Error(c?.error?.message||"Création Instagram impossible.");const r2=await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(conn.account_id)}/media_publish`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({creation_id:String(c.id),access_token:conn.access_token})});const p=await r2.json();if(!r2.ok)throw new Error(p?.error?.message||"Publication Instagram impossible.");external=p.id||"";}
  else throw new Error(`Publication automatique ${job.provider} non activée.`);
  await fetch(`${base}/rest/v1/social_share_jobs?id=eq.${encodeURIComponent(jobId)}`,{method:"PATCH",headers:{...h,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({status:"published",external_post_id:external||null,error_message:null,published_at:new Date().toISOString()})});
  return json({ok:true,status:"published",external_post_id:external||null});
 }catch(e){return json({error:e instanceof Error?e.message:"Publication impossible."},400);}
});