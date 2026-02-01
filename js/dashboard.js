let all=[];
async function loadDashboard(){all=await loadCSV("data/full.csv");render(all);}
function applyFilters(){
const q=search.value.toLowerCase(),t=type.value,s=status.value;
render(all.filter(v=>
(t==="ALL"||v.type===t)&&(s==="ALL"||v.status===s)&&
Object.values(v).join(" ").toLowerCase().includes(q)));
}
function render(l){
const b=document.querySelector("tbody");b.innerHTML="";
l.forEach(v=>b.innerHTML+=
`<tr onclick="location='view.html?id=${v.vehicle_id}'"><td>${v.type}</td><td>${v.brand}</td><td>${v.model}</td><td>${v.number}</td><td>${v.status}</td></tr>`);
}