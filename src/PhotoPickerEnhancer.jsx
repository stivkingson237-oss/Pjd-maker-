import React,{useEffect}from'react';
import{supabase}from'./lib/supabase';

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
    const text=(label.querySelector('span')?.textContent||label.textContent||'').trim().toLowerCase();
    const isPhotoField=text.includes('photo de profil')||text.includes('logo')||text.includes('bannière')||text.includes('banner')||text.includes('photo');
    if(!isPhotoField||label.dataset.photoPickerReady)return;
    const input=label.querySelector('input:not([type="file"])');if(!input)return;
    label.dataset.photoPickerReady='1';
    const button=document.createElement('button');
    button.type='button';button.className='photo-picker-btn';
    button.innerHTML='<span class="photo-picker-icon">＋</span><span>Choisir une photo dans la galerie</span>';
    const preview=document.createElement('img');preview.className='photo-picker-preview';preview.alt='Aperçu de la photo';preview.style.display=input.value?'block':'none';if(input.value)preview.src=input.value;
    input.style.display='none';input.parentNode?.insertBefore(button,input);input.parentNode?.insertBefore(preview,input);
    const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.style.display='none';picker.setAttribute('aria-label','Choisir une photo dans la galerie');
    label.appendChild(picker);
    button.addEventListener('click',()=>picker.click());
    picker.addEventListener('change',async()=>{
     const file=picker.files?.[0];if(!file)return;
     if(!file.type.startsWith('image/')){alert('Sélectionnez une image.');return;}
     if(file.size>6*1024*1024){alert('Image trop volumineuse. Maximum 6 Mo.');return;}
     button.disabled=true;button.innerHTML='<span>Importation…</span>';
     const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
     const kind=text.includes('photo de profil')?'avatar':text.includes('logo')?'logo':'banner';
     const path=`${userId}/${kind}-${Date.now()}.${ext}`;
     const{error}=await supabase.storage.from('profile-media').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
     if(error){button.disabled=false;button.innerHTML='<span class="photo-picker-icon">＋</span><span>Choisir une photo dans la galerie</span>';alert(`Impossible d'importer la photo : ${error.message}`);return;}
     const{data}=supabase.storage.from('profile-media').getPublicUrl(path);const url=data?.publicUrl;
     if(url){setControlledValue(input,url);preview.src=url;preview.style.display='block';}
     button.disabled=false;button.innerHTML='<span class="photo-picker-icon">✓</span><span>Photo sélectionnée</span>';
    });
   });
  };
  setup();const observer=new MutationObserver(setup);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
 },[session]);
 return null;
}
