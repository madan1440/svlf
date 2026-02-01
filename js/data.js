async function loadCSV(p){
const t=await fetch(p).then(r=>r.text());
const [h,...r]=t.trim().split("\n");
const k=h.split(",");
return r.map(l=>Object.fromEntries(l.split(",").map((v,i)=>[k[i],v])));
}