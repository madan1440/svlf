async function loadView(){
const id=new URLSearchParams(location.search).get("id");
const v=(await loadCSV("data/full.csv")).find(x=>x.vehicle_id===id);
const e=(await loadCSV("data/emi.csv")).filter(x=>x.vehicle_id===id);
title.innerText=v.brand+" "+v.model;
info.innerHTML=Object.entries(v).map(([k,v])=>`<p><b>${k}</b>: ${v}</p>`).join("");
e.forEach(x=>emi.innerHTML+=`<tr><td>${x.emi_no}</td><td>${x.emi_date}</td><td>${x.amount}</td><td>${x.status}</td></tr>`);
}