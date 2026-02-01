// js/auth.js
// Static users with roles. First two are admins.
const USERS=[
  {username:"9492126272",password:"Madan@1440",name:"Admin One", role:"admin"},
  {username:"9490479284",password:"Laxmi@6799",name:"Admin Two", role:"admin"},
  {username:"9492146644",password:"Rupa@0642",name:"User One", role:"user"},
  {username:"9492948661",password:"Venky@8661",name:"User Two", role:"user"}
];

function login(){
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value;
  const user = USERS.find(x=>x.username===u && x.password===p);
  const err = document.getElementById('error');
  if(!user){ err.innerText='Invalid username or password'; return; }
  // store role as well
  localStorage.setItem('vf_user', JSON.stringify({username:user.username,name:user.name, role:user.role}));
  window.location.href='index.html';
}

function demo(){ 
  const user = USERS[0];
  localStorage.setItem('vf_user', JSON.stringify({username:user.username,name:user.name, role:user.role}));
  window.location.href='index.html';
}

function requireLogin(){
  const raw = localStorage.getItem('vf_user');
  if(!raw){
    window.location.href='login.html';
    return;
  }
  // expose current user globally
  try{
    window.CURRENT_USER = JSON.parse(raw);
  }catch(e){
    window.CURRENT_USER = null;
  }
  // update admin UI (download icon)
  updateAdminUI();
}

function logout(){
  localStorage.removeItem('vf_user');
  window.location.href='login.html';
}

function isAdmin(){
  return window.CURRENT_USER && window.CURRENT_USER.role === 'admin';
}

function updateAdminUI(){
  // show/hide element with id 'adminDownloadBtn'
  const btn = document.getElementById('adminDownloadBtn');
  if(!btn) return;
  if(isAdmin()){
    btn.style.display = 'inline-block';
  } else {
    btn.style.display = 'none';
  }
}

// Trigger both CSV downloads sequentially (two downloads)
async function downloadAllCSVs(){
  // This will try to fetch both CSVs and prompt downloads for each.
  const files = [
    {path:'data/full.csv', name:'full.csv'},
    {path:'data/emi.csv', name:'emi.csv'}
  ];
  for(const f of files){
    try{
      const res = await fetch(f.path, {cache:"no-store"});
      if(!res.ok){
        console.warn('failed to fetch', f.path);
        continue;
      }
      const txt = await res.text();
      const blob = new Blob([txt], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // small delay to ensure browser registers sequential downloads
      await new Promise(r => setTimeout(r, 300));
    }catch(e){
      console.error('download failed', f, e);
    }
  }
}
