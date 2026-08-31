(function(){
 const KEY='homedeco_save_v1';
 const TOKEN_KEY='homedeco_github_token_v1';
 const CLOUD={owner:'namiyukuta-cmd',repo:'private-game-data',path:'homedeco/save.json'};
 const DEFAULT_FAVORITES={
   fridge:[
     {name:'牛乳',unit:'本'},
     {name:'卵',unit:'パック'},
     {name:'納豆',unit:'パック'},
     {name:'豆腐',unit:'丁'},
     {name:'ヨーグルト',unit:'個'},
     {name:'バナナ',unit:'本'},
     {name:'食パン',unit:'袋'},
     {name:'鶏もも肉',unit:'枚'},
     {name:'豚肉',unit:'パック'}
   ],
   misc:[
     {name:'トイレットペーパー',unit:'ロール'},
     {name:'ティッシュ',unit:'箱'},
     {name:'洗濯洗剤',unit:'本'},
     {name:'食器用洗剤',unit:'本'},
     {name:'ゴミ袋',unit:'枚'},
     {name:'歯磨き粉',unit:'本'}
   ]
 };

 function clone(v){return JSON.parse(JSON.stringify(v));}
 function initial(){return {version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),items:clone(window.HOMEDECO_INITIAL_ITEMS||{}),trash:{},favorites:clone(DEFAULT_FAVORITES)};}
 function load(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}}
 function save(state){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));return state;}
 function normalizeFavorite(value){
   if(typeof value==='string')return {name:value.trim(),unit:''};
   if(value&&typeof value==='object')return {name:String(value.name||'').trim(),unit:String(value.unit||'').trim()};
   return {name:'',unit:''};
 }
 function favoriteKey(name){return String(name||'').trim().toLocaleLowerCase('ja');}
 function mergeFavorites(saved,defaults){
   const out=[];
   (Array.isArray(defaults)?defaults:[]).forEach(value=>{
     const f=normalizeFavorite(value);
     if(f.name&&!out.some(x=>favoriteKey(x.name)===favoriteKey(f.name)))out.push(f);
   });
   (Array.isArray(saved)?saved:[]).forEach(value=>{
     const f=normalizeFavorite(value);
     if(!f.name)return;
     const existing=out.find(x=>favoriteKey(x.name)===favoriteKey(f.name));
     if(existing){if(f.unit)existing.unit=f.unit;}
     else out.push(f);
   });
   return out;
 }
 function ensure(){
   let s=load();
   if(!s){s=initial();save(s);return s;}
   let changed=false;
   if(!s.items){s.items={};changed=true;}
   if(!s.trash){s.trash={};changed=true;}
   if(!s.favorites||typeof s.favorites!=='object'){s.favorites={};changed=true;}
   Object.keys(DEFAULT_FAVORITES).forEach(category=>{
     const merged=mergeFavorites(s.favorites[category],DEFAULT_FAVORITES[category]);
     if(JSON.stringify(merged)!==JSON.stringify(s.favorites[category])){s.favorites[category]=merged;changed=true;}
   });
   if(changed)save(s);
   return s;
 }
 function reset(){const s=initial();save(s);return s;}
 function hasSave(){return !!load();}
 function makeItemId(){return 'item_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
 function addItem(item){const s=ensure(),id=makeItemId();s.items[id]={name:String(item.name||'').trim(),quantity:Number(item.quantity)||0,unit:String(item.unit||'').trim(),furniture:item.furniture||'',section:item.section||'',expiration:item.expiration||'',memo:String(item.memo||'').trim(),garbage:item.garbage||''};save(s);return id;}
 function updateItem(id,patch){const s=ensure();if(!s.items[id])return false;Object.assign(s.items[id],patch);save(s);return true;}
 function removeItem(id){const s=ensure();if(!s.items[id])return false;delete s.items[id];save(s);return true;}
 function discardItem(id){const s=ensure(),item=s.items[id];if(!item)return false;const rule=(window.HOMEDECO_GOMI_RULES||{})[item.garbage];const category=rule?rule.category:'unclassified';if(!s.trash[category])s.trash[category]=[];s.trash[category].push({id:'trash_'+Date.now(),name:item.name,quantity:item.quantity,unit:item.unit,sourceItemId:id,discardedAt:new Date().toISOString(),rule:item.garbage});delete s.items[id];save(s);return true;}
 function emptyBag(category){const s=ensure();s.trash[category]=[];save(s);}
 function getFavorites(category){const s=ensure();return Array.isArray(s.favorites[category])?clone(s.favorites[category]):[];}
 function addFavorite(category,name,unit){
   const s=ensure();
   const n=String(name||'').trim();
   const u=String(unit||'').trim();
   if(!n)return false;
   if(!Array.isArray(s.favorites[category]))s.favorites[category]=[];
   const existing=s.favorites[category].find(x=>favoriteKey(normalizeFavorite(x).name)===favoriteKey(n));
   if(existing){
     const normalized=normalizeFavorite(existing);
     if(u&&normalized.unit!==u){existing.name=n;existing.unit=u;save(s);return true;}
     return false;
   }
   s.favorites[category].push({name:n,unit:u});
   save(s);
   return true;
 }
 function exportSave(){const s=ensure();const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='homedeco_save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 function importSave(file,done){const r=new FileReader();r.onload=()=>{try{const s=JSON.parse(r.result);save(s);ensure();done&&done(true);}catch(e){done&&done(false);}};r.readAsText(file);}

 function cleanToken(token){return String(token||'').replace(/\s+/g,'');}
 function getToken(){return cleanToken(localStorage.getItem(TOKEN_KEY)||'');}
 function setToken(token){const t=cleanToken(token);if(t)localStorage.setItem(TOKEN_KEY,t);else localStorage.removeItem(TOKEN_KEY);return !!t;}
 function clearToken(){localStorage.removeItem(TOKEN_KEY);}
 function cloudUrl(){return 'https://api.github.com/repos/'+encodeURIComponent(CLOUD.owner)+'/'+encodeURIComponent(CLOUD.repo)+'/contents/'+CLOUD.path.split('/').map(encodeURIComponent).join('/');}
 function headers(token){return {'Accept':'application/vnd.github+json','Authorization':'Bearer '+cleanToken(token),'X-GitHub-Api-Version':'2022-11-28'};}
 function encodeBase64Utf8(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);return btoa(binary);}
 function decodeBase64Utf8(text){const binary=atob(String(text||'').replace(/\s/g,''));const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new TextDecoder().decode(bytes);}

 function githubError(status,action){
   let message='GitHub'+action+'できませんでした ('+status+')';
   if(status===401)message='トークンがGitHubに認証されませんでした。トークンをコピーし直して、もう一度設定してください。';
   else if(status===404)message='トークンは認証されましたが、private-game-data / homedeco / save.json を読めません。トークンのRepository accessで private-game-data が選ばれているか確認してください。';
   else if(status===403)message='GitHubの権限が足りません。トークンのContents権限を Read and write にしてください。';
   const err=new Error(message);err.status=status;return err;
 }

 async function fetchCloudFile(token){
   const res=await fetch(cloudUrl(),{headers:headers(token)});
   if(!res.ok)throw githubError(res.status,'から読み込み');
   return res.json();
 }

 async function checkToken(token){
   const t=cleanToken(token||getToken());
   if(!t)throw new Error('GitHubトークンが入力されていません。');
   const file=await fetchCloudFile(t);
   return {ok:true,sha:file.sha||''};
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
   if(!res.ok)throw githubError(res.status,'へ保存');
   return res.json();
 }

 async function loadFromGitHub(){
   const token=getToken();
   if(!token)throw new Error('GitHubトークンが設定されていません。');
   const file=await fetchCloudFile(token);
   let state;
   try{state=JSON.parse(decodeBase64Utf8(file.content));}catch(e){throw new Error('GitHubのsave.jsonはまだHome Decoのセーブ形式ではありません。最初は「GitHubへ保存」を押してください。');}
   if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('GitHubのsave.jsonを読み込めません。');
   save(state);
   ensure();
   return load();
 }

 window.HomeDecoSave={KEY,TOKEN_KEY,CLOUD,DEFAULT_FAVORITES,initial,load,save,ensure,reset,hasSave,addItem,updateItem,removeItem,discardItem,emptyBag,getFavorites,addFavorite,exportSave,importSave,getToken,setToken,clearToken,checkToken,saveToGitHub,loadFromGitHub};
})();
