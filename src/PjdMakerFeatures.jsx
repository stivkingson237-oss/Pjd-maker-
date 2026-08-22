import React,{useState}from'react';
import{ArrowLeft,ShoppingBag,Briefcase,Truck,Home,Car,Wallet,MessageSquare,Bell,Star,Users,ShieldCheck,Gift,Megaphone,Sparkles,Search,Heart,Settings,BarChart3,UserPlus}from'lucide-react';
import'./pjd-maker-features.css';

const modules=[
 {id:'marketplace',icon:ShoppingBag,title:'Marketplace multi-vendeur',text:'Produits physiques et numériques, boutiques, stocks, commandes, promotions et retrait ou livraison.'},
 {id:'services',icon:Briefcase,title:'Services professionnels',text:'Mise en relation avec des plombiers, électriciens, vitriers, menuisiers, développeurs et autres professionnels.'},
 {id:'delivery',icon:Truck,title:'Transport & livraison',text:'Livraison de colis, repas, courses et marchandises avec suivi et calcul des frais.'},
 {id:'realestate',icon:Home,title:'Immobilier',text:'Maisons, appartements, terrains, bureaux, résidences et locations saisonnières.'},
 {id:'auto',icon:Car,title:'Automobile',text:'Voitures, motos, location, pièces détachées et garages partenaires.'},
 {id:'jobs',icon:Users,title:'Emploi & freelance',text:'Offres d’emploi, CV, recrutement, missions freelance et prestations temporaires.'},
 {id:'payments',icon:Wallet,title:'Paiements intégrés',text:'MTN Mobile Money, Orange Money, cartes bancaires et PJD Wallet.'},
 {id:'chat',icon:MessageSquare,title:'Messagerie',text:'Chat en temps réel, photos, documents et évolutions audio/vidéo.'},
 {id:'notifications',icon:Bell,title:'Notifications',text:'Commandes, paiements, livraisons, promotions et nouveaux messages.'},
 {id:'reviews',icon:Star,title:'Avis & évaluations',text:'Notes, commentaires et signalement des abus.'},
 {id:'referral',icon:Gift,title:'Parrainage',text:'Invitations, commissions automatiques, récompenses et fidélité.'},
 {id:'ads',icon:Megaphone,title:'Publicité',text:'Produits sponsorisés, boutiques mises en avant et campagnes publicitaires.'},
 {id:'ai',icon:Sparkles,title:'Intelligence artificielle',text:'Recommandations, assistant intelligent, recherche et détection des activités suspectes.'},
 {id:'security',icon:ShieldCheck,title:'Sécurité',text:'Authentification, protection des comptes, contrôle des accès et surveillance des opérations.'},
 {id:'accounts',icon:UserPlus,title:'Comptes & rôles',text:'Client, vendeur, prestataire, livreur et administrateur avec espaces adaptés.'},
 {id:'analytics',icon:BarChart3,title:'Tableaux de bord',text:'Ventes, revenus, produits, commandes, stocks et statistiques de la plateforme.'}
];

export default function PjdMakerFeatures({onBack}){
 const[q,setQ]=useState('');const[selected,setSelected]=useState(null);const filtered=modules.filter(m=>`${m.title} ${m.text}`.toLowerCase().includes(q.toLowerCase()));
 return <main className="pjd-features"><div className="pjd-features-top"><button className="pf-back"onClick={onBack}><ArrowLeft size={18}/>Retour à PJD Maker</button><div><b>PJD Maker</b><span>Plateforme numérique tout-en-un</span></div></div><section className="pf-hero"><span className="pf-eyebrow">PJD MAKER · ÉCOSYSTÈME</span><h1>Tout acheter, tout vendre, tous les services en un seul endroit.</h1><p>Les principales fonctions de PJD Maker sont regroupées ici pour construire une expérience unique pour les clients, vendeurs, prestataires, livreurs et administrateurs.</p><div className="pf-search"><Search size={19}/><input value={q}onChange={e=>setQ(e.target.value)}placeholder="Rechercher une fonctionnalité..."/></div></section><section className="pf-grid">{filtered.map(({id,icon:Icon,title,text})=><button key={id}className="pf-card"onClick={()=>setSelected(id)}><span className="pf-icon"><Icon size={22}/></span><span><strong>{title}</strong><small>{text}</small></span></button>)}</section>{selected&&<div className="pf-detail"role="dialog"><div className="pf-detail-card"><button className="pf-close"onClick={()=>setSelected(null)}>×</button><span className="pf-icon"><Settings size={22}/></span><h2>{modules.find(m=>m.id===selected)?.title}</h2><p>{modules.find(m=>m.id===selected)?.text}</p><div className="pf-status"><Heart size={16}/>Module prévu dans l’architecture PJD Maker</div></div></div>}<section className="pf-footer"><b>PJD Maker</b><span>Tout acheter, tout vendre, tous les services en un seul endroit.</span></section></main>;
}
