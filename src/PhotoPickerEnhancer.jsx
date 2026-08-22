import React,{useEffect}from'react';
import{supabase}from'./lib/supabase';
import{ImagePlus}from'lucide-react';

function setControlledValue(input,value){
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
 setter?.call(input,value);
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
}

export default function PhotoPickerEnhancer({session}){
 useEffect(()=>{
  if(!session?.user)return;
  const userId=session.user.id;
  const setup=()=>{
   const labels=[...document.querySelectorAll('label')];
   labels.forEach(label=>{
    const text=(label.querySelector('span')?.textContent||'').trim().toLowerCase();
    if(!text.includes('photo de profil (url)')&&!text.includes('logo (url)')&&!text.includes('bannière (url)'))return;
    if(label.dataset.photoPickerReady)return;
    const input=label.querySelector('input');if(!input)return;
    label.dataset.photoPickerReady='1';
    const button=document.createElement('button');
    button.type='button';
    button.className='photo-picker-btn';
    button.innerHTML='<span class="photo-picker-icon">＋</span><span>Choisir une photo dans la galerie</span>';
    const preview=document.createElement('img');
    preview.className='photo-picker-preview';
    preview.alt='Aperçu';
    preview.style.display=input.value?'block':'none';
    if(input.value)preview.src=input.value;
    input.style.display='none';
    input.parentNode?.insertBefore(button,input);
    input.parentNode?.insertBefore(preview,input);
    const picker=document.createElement('input');
    picker.type='file';picker.accept='image/*';picker.setAttribute('capture','environment');picker.style.display='none';
    label.appendChild(picker);
    button.addEventListener('click',()=>picker.click());
    picker.addEventListener('change',async()=>{
     const file=picker.files?.[0];if(!file)return;
     if(!file.type.startsWith('image/'))return alert('Sélectionnez une image.');
     if(file.size>6*1024*1024)return alert('Image trop volumineuse. Maximum 6 Mo.');
     button.disabled=true;button.innerHTML='<span>Importation…</span>';
     const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
     const kind=text.includes('photo de profil')?'avatar':text.includes('logo')?'logo':'banner';
     const path=`${userId}/${kind}-${Date.now()}.${ext}`;
     const{error}=await supabase.storage.from('profile-media').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
     if(error){button.disabled=false;button.innerHTML='<span class="photo-picker-icon">＋</span><span>Choisir une photo dans la galerie</span>';alert(`Impossible d'importer la photo : ${error.message}`);return;}
     const{data}=supabase.storage.from('profile-media').getPublicUrl(path);
     const url=data?.publicUrl;if(url){setControlledValue(input,url);preview.src=url;preview.style.display='block';}
     button.disabled=false;button.innerHTML='<span class="photo-picker-icon">✓</span><span>Photo sélectionnée</span>';
    });
   });
  };
  setup();
  const observer=new MutationObserver(setup);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[session]);
 return null;
}
