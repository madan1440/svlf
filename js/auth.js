const USERS=[
{username:"9492126272",password:"Madan@1440",name:"Admin One"},
{username:"9490479284",password:"Laxmi@6799",name:"Admin Two"},
{username:"9492146644",password:"Rupa@0642",name:"User One"},
{username:"9492948661",password:"Venky@8661",name:"User Two"}
];

function login(){
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value;
  const user = USERS.find(x=>x.username===u && x.password===p);
  const err = document.getElementById('error');
  if(!user){ err.innerText='Invalid username or password'; return; }
  localStorage.setItem('vf_user', JSON.stringify({username:user.username,name:user.name}));
  window.location.href='index.html';
}
function demo(){ const user=USERS[0]; localStorage.setItem('vf_user', JSON.stringify({username:user.username,name:user.name})); window.location.href='index.html'; }
function requireLogin(){ if(!localStorage.getItem('vf_user')){ window.location.href='login.html'; } }
function logout(){ localStorage.removeItem('vf_user'); window.location.href='login.html'; }
function downloadCSV(path){ window.open(path, '_blank'); }
