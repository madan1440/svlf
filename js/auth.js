const USERS=[
{username:"9492126272",password:"Madan@1440"},
{username:"9490479284",password:"Laxmi@6799"},
{username:"9492146644",password:"Rupa@0642"},
{username:"9492948661",password:"Venky@8661"}
];
function login(){
const u=username.value,p=password.value;
const ok=USERS.find(x=>x.username===u&&x.password===p);
if(!ok){error.innerText="Invalid";return;}
localStorage.setItem("user","1");location="index.html";
}
function requireLogin(){if(!localStorage.getItem("user"))location="login.html";}
function logout(){localStorage.clear();location="login.html";}