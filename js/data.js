async function loadCSV(path){
  try{
    const res = await fetch(path, {cache: "no-store"});
    if(!res.ok) return [];
    const txt = await res.text();
    const rows = txt.trim().split('\n').filter(Boolean);
    if(rows.length<=1) return [];
    const keys = rows[0].split(',').map(k=>k.trim());
    return rows.slice(1).map(line=>{
      const vals = line.split(',').map(v=>v.trim());
      const obj = {}; keys.forEach((k,i)=> obj[k]= (vals[i]===undefined? '': vals[i]) );
      return obj;
    });
  }catch(e){ console.error('loadCSV', e); return []; }
}
