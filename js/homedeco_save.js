(function(){
 const KEY='homedeco_save_v1';
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
 window.HomeDecoSave={KEY,initial,load,save,ensure,reset,hasSave,addItem,updateItem,removeItem,discardItem,emptyBag,exportSave,importSave};
})();
