// Shared Supabase REST access for the multilingual ranking pages.
// Diagnostic build: shows the actual Supabase error during registration.
(function(){
  const config=window.GRQ_SUPABASE_CONFIG;
  if(!config || !config.url || !config.publishableKey) throw new Error('Supabase configuration is missing.');
  const root=config.url.replace(/\/$/,'')+'/rest/v1/grq_ranking';
  const columns='id,name,code,tier,tier_emoji,img_key,rare,locations,total_score,ts,created_at';
  async function request(url,options={}){
    let response;
    try{
      response=await fetch(url,{...options,cache:'no-store',headers:{
        apikey:config.publishableKey,
        Accept:'application/json',
        ...(options.body?{'Content-Type':'application/json'}:{}),
        ...(options.headers||{})
      }});
    }catch(error){
      throw new Error('通信エラー: '+(error&&error.message?error.message:'Supabaseに接続できませんでした。'));
    }
    if(!response.ok){
      const raw=(await response.text()).slice(0,700);
      let detail=raw;
      try{
        const parsed=JSON.parse(raw);
        detail=[parsed.message,parsed.details,parsed.hint,parsed.code].filter(Boolean).join(' / ')||raw;
      }catch(_){ }
      throw new Error('HTTP '+response.status+(detail?': '+detail:''));
    }
    if(response.status===204)return null;
    const text=await response.text();return text?JSON.parse(text):null;
  }
  function fromRow(row){return {
    id:row.id,name:row.name,code:row.code,tier:row.tier,tierEmoji:row.tier_emoji,
    imgKey:row.img_key,rare:!!row.rare,locations:Array.isArray(row.locations)?row.locations:[],
    totalScore:Number(row.total_score)||0,ts:Number(row.ts)||Date.parse(row.created_at)||0,createdAt:row.created_at
  };}
  async function load(){
    const rows=await request(root+'?select='+columns+'&order=total_score.desc,ts.desc&limit=1000');
    return (rows||[]).map(fromRow);
  }
  async function insert(entry){
    const row={
      name:String(entry.name||'').slice(0,12),code:String(entry.code||''),tier:String(entry.tier||''),
      tier_emoji:String(entry.tierEmoji||''),img_key:String(entry.imgKey||''),rare:!!entry.rare,
      locations:Array.isArray(entry.locations)?entry.locations.slice(0,3):[],
      total_score:Number(entry.totalScore)||0,ts:Number(entry.ts)||Date.now(),
      created_at:new Date(Number(entry.ts)||Date.now()).toISOString()
    };
    try{
      const rows=await request(root,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
      return fromRow((rows&&rows[0])||row);
    }catch(error){
      console.error('Supabase ranking insert failed:',error);
      const lang=document.documentElement.lang||'ja';
      const label=lang.startsWith('en')?'Registration error':lang.startsWith('zh')?'登记错误':lang.startsWith('ko')?'등록 오류':'登録エラー';
      window.alert(label+'\n'+(error&&error.message?error.message:String(error)));
      throw error;
    }
  }
  window.GRQRankingStore=Object.freeze({load,insert});
})();
