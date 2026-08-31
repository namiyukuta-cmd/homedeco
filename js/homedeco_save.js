(function(){
 const KEY='homedeco_save_v1';
 const TOKEN_KEY='homedeco_github_token_v1';
 const CLOUD={owner:'namiyukuta-cmd',repo:'private-game-data',path:'homedeco/save.json'};

 function clone(v){return JSON.parse(JSON.stringify(v));}
 function initial(){return {version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),items:clone(window.HOMEDECO_INITIAL_ITEMS||{}),trash:{}};}
 function load(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}}
 function save(state){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));return state;}
 function ensure(){let s=load();if(!s){s=initial();save(s);}if(!s.items)s.items={};if(!s.trash)s.trash={};return s;}
 function reset(){const s=initial();save(s);return s;}
 function hasSave(){return !!load();}
 function makeItemId(){return 'item_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
 function addItem(item){const s=ensure(),id=makeItemId();s.items[id]={name:String(item.name||'').trim(),quantity:Number(item.quantity)||0,unit:String(item.unit||'').trim(),furniture:item.furniture||'',section:item.section||'',expiration:item.expiration||'',memo:String(item.memo||'').trim(),garbage:item.garbage||''};save(s);return id;}
 function updateItem(id,patch){const s=ensure();if(!s.items[id])return false;Object.assign(s.items[id],patch);save(s);return true;}
 function removeItem(id){const s=ensure();if(!s.items[id])return false;delete s.items[id];save(s);return true;}
 function discardItem(id){const s=ensure(),item=s.items[id];if(!item)return false;const rule=(window.HOMEDECO_GOMI_RULES||{})[item.garbage];const category=rule?rule.category:'unclassified';if(!s.trash[category])s.trash[category]=[];s.trash[category].push({id:'trash_'+Date.now(),name:item.name,quantity:item.quantity,unit:item.unit,sourceItemId:id,discardedAt:new Date().toISOString(),rule:item.garbage});delete s.items[id];save(s);return true;}
 function emptyBag(category){const s=ensure();s.trash[category]=[];save(s);}
 function exportSave(){const s=ensure();const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='homedeco_save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 function importSave(file,done){const r=new FileReader();r.onload=()=>{try{const s=JSON.parse(r.result);save(s);done&&done(true);}catch(e){done&&done(false);}};r.readAsText(file);}

 function getToken(){return localStorage.getItem(TOKEN_KEY)||'';}
 function setToken(token){const t=String(token||'').trim();if(t)localStorage.setItem(TOKEN_KEY,t);else localStorage.removeItem(TOKEN_KEY);return !!t;}
 function clearToken(){localStorage.removeItem(TOKEN_KEY);}
 function cloudUrl(){return 'https://api.github.com/repos/'+encodeURIComponent(CLOUD.owner)+'/'+encodeURIComponent(CLOUD.repo)+'/contents/'+CLOUD.path.split('/').map(encodeURIComponent).join('/');}
 function headers(token){return {'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};}
 function encodeBase64Utf8(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);return btoa(binary);}
 function decodeBase64Utf8(text){const binary=atob(String(text||'').replace(/\s/g,''));const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new TextDecoder().decode(bytes);}

 async function fetchCloudFile(token){
   const res=await fetch(cloudUrl(),{headers:headers(token)});
   if(!res.ok){const err=new Error('GitHubから読み込めませんでした ('+res.status+')');err.status=res.status;throw err;}
   return res.json();
 }

 async function saveToGitHub(){
   const token=getToken();
   if(!token)throw new Error('GitHubトークンが設定されていません。');
   let sha='';
   try{const current=await fetchCloudFile(token);sha=current.sha||'';}catch(e){if(e.status!==404)throw e;}
   const state=ensure();
   const body={message:'Update Home Deco save',content:encodeBase64Utf8(JSON.stringify(state,null,2))};
   if(sha)body.sha=sha;
   const res=await fetch(cloudUrl(),{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},headers(token)),body:JSON.stringify(body)});
   if(!res.ok)throw new Error('GitHubへ保存できませんでした ('+res.status+')');
   return res.json();
 }

 async function loadFromGitHub(){
   const token=getToken();
   if(!token)throw new Error('GitHubトークンが設定されていません。');
   const file=await fetchCloudFile(token);
   let state;
   try{state=JSON.parse(decodeBase64Utf8(file.content));}catch(e){throw new Error('GitHubのsave.jsonがまだHome Decoのセーブ形式ではありません。先に「GitHubへ保存」を1回押してください。');}
   if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('GitHubのsave.jsonを読み込めません。');
   save(state);
   return state;
 }

 window.HomeDecoSave={KEY,TOKEN_KEY,CLOUD,initial,load,save,ensure,reset,hasSave,addItem,updateItem,removeItem,discardItem,emptyBag,exportSave,importSave,getToken,setToken,clearToken,saveToGitHub,loadFromGitHub};
})();
