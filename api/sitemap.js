const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lrlukgkaarzuqotefhlc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_zkGGMilXntgSTG8ajxi1rQ_bdvm-Ogs';
const SITE = 'https://pjd-maker.vercel.app';
function xmlEscape(value='') { return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
export default async function handler(req,res) {
  try {
    const headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY};
    const urls=[SITE+'/',SITE+'/politique-confidentialite'];
    for (const table of ['marketplace_products','digital_products']) {
      const url=SUPABASE_URL+'/rest/v1/'+table+'?select=id&status=in.(approved,active,actif)&limit=5000';
      const response=await fetch(url,{headers});
      if(!response.ok) continue;
      const rows=await response.json();
      for(const row of rows||[]) if(row.id) urls.push(SITE+'/produit/'+encodeURIComponent(row.id));
    }
    const unique=[...new Set(urls)];
    const body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+unique.map(url=>'  <url><loc>'+xmlEscape(url)+'</loc></url>').join('\n')+'\n</urlset>';
    res.statusCode=200; res.setHeader('Content-Type','application/xml; charset=utf-8'); res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400'); return res.end(body);
  } catch(error) { res.statusCode=500; res.setHeader('Content-Type','application/xml; charset=utf-8'); return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://pjd-maker.vercel.app/</loc></url></urlset>'); }
}