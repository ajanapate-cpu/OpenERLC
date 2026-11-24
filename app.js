/* OpenERLC chat logic. Without Claude, it shows the closest entries from knowledge.js. */
var $ = function(id){return document.getElementById(id)};
function strip(h){var d=document.createElement("div");d.innerHTML=h;
  d.querySelectorAll("tr").forEach(function(r){r.appendChild(document.createTextNode("\n"))});
  d.querySelectorAll("td,th").forEach(function(c){c.appendChild(document.createTextNode(" | "))});
  d.querySelectorAll("li").forEach(function(c){c.insertBefore(document.createTextNode("- "),c.firstChild);c.appendChild(document.createTextNode("\n"))});
  return d.textContent||""}

/* Knowledge base text handed to Claude with every question */
var KB = E.map(function(e){return "Q: "+e.q+"\nA: "+strip(e.a).replace(/\n{2,}/g,"\n").trim()+"\n(Source: "+e.s+")"}).join("\n\n");
var FRESH="The knowledge base was last refreshed on 24 November 2026. The newest event it covers in detail is the Map Update of late September 2026; a Halloween 2026 event is known only by headline. When asked about anything newer, say it is not covered and point to the PRC Discord, @PRC_Roblox on X or the Roblox DevForum update logs. When asked for the latest update, lead with the Map Update.\n\n";
var RULES = FRESH+
"You are OpenERLC, the assistant of an unofficial fan encyclopedia (ERLCPedia) for Emergency Response: Liberty County (ER:LC), a Roblox game by Police Roleplay Community (PRC). Answer the user's questions using the knowledge base below.\n\n"+
"Rules:\n- Ground answers in the knowledge base. If it only partly covers the question, give what it covers and say what is missing.\n- If you add general knowledge that is not in the knowledge base, say it may be out of date and point to the ER:LC Wiki, update logs or apidocs.erlc.gg.\n- Never invent vehicle names, prices, command syntax, XP numbers or API endpoints. Say you are not sure instead.\n- Never ask for or repeat server keys or API keys.\n- Be concise and direct. Use short paragraphs and '-' bullet lists. You may use **bold** and `code`. No headings, no tables.\n- If the question is unrelated to ER:LC, Roblox roleplay servers or running an ER:LC community, politely say you only cover ER:LC, give one example question and do not answer the unrelated topic.\n- If the user greets you or makes small talk (hi, hello, thanks, who are you), reply in one or two short, natural sentences, introduce yourself as OpenERLC and invite an ER:LC question. Do not recite knowledge base entries unless asked.\n- Not every message is a question. If the user shares news or an update about ER:LC, acknowledge it and say it is not in your knowledge yet and that the site owner updates it manually.\n- Reply in the language the user writes in.\n\nKNOWLEDGE BASE\n\n"+KB+"\n\nEND OF KNOWLEDGE BASE. The conversation follows.";

/* Fallback retrieval, used when asking Claude is not available */
var STOP = "a an the is are was were do does did how what who when where why which can i you my me to of in on for and or it its this that with about tell show give list".split(" ");
E.forEach(function(e){e.text=(e.q+" "+e.t+" "+strip(e.a)).toLowerCase()});
function retrieve(q){
  var terms=q.toLowerCase().replace(/[^a-z0-9:;.\- ]/g," ").split(/\s+/).filter(function(w){return w&&STOP.indexOf(w)<0});
  var rows=[];
  E.forEach(function(e){var s=0;terms.forEach(function(w){
    if(e.q.toLowerCase().indexOf(w)>=0)s+=4; if(e.t.indexOf(w)>=0)s+=3; if(e.text.indexOf(w)>=0)s+=1});
    if(s>0)rows.push({e:e,s:s})});
  rows.sort(function(a,b){return b.s-a.s});
  return rows.slice(0,2).map(function(r){return r.e});
}

/* Tiny safe markdown: escape first, then format */
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function inl(s){return s.replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>")}
function md(s){
  var out=[],list=false;
  esc(s).split("\n").forEach(function(l){
    var m=l.match(/^\s*[-*]\s+(.*)/);
    if(m){if(!list){out.push("<ul>");list=true} out.push("<li>"+inl(m[1])+"</li>")}
    else{if(list){out.push("</ul>");list=false} if(l.trim())out.push("<p>"+inl(l)+"</p>")}
  });
  if(list)out.push("</ul>");
  return out.join("");
}

var SUGGEST=["What teams are there?","What are the police ranks?","What does FRP mean?"];
var sample=null, turns=[], busy=false, ctl=null;

function scrollEnd(){window.scrollTo({top:document.documentElement.scrollHeight})}

function showHello(){
  var st=$("stream"); st.innerHTML="";
  var h=document.createElement("div"); h.className="hello";
  h.innerHTML="<h2>Ask anything about ER:LC</h2><div class='chips'></div>";
  var chips=h.querySelector(".chips");
  SUGGEST.forEach(function(s){var b=document.createElement("button");b.type="button";b.className="chip";b.textContent=s;b.onclick=function(){ask(s)};chips.appendChild(b)});
  st.appendChild(h);
}

function addMsg(role){
  var st=$("stream"); var hello=st.querySelector(".hello"); if(hello)hello.remove();
  var m=document.createElement("div"); m.className="msg "+role;
  var w=document.createElement("span"); w.className="who"; w.textContent=role==="user"?"You":"OpenERLC";
  var b=document.createElement("div"); b.className="bubble";
  m.appendChild(w); m.appendChild(b); st.appendChild(m); return b;
}

function setBusy(v){busy=v;var s=$("send");s.textContent=v&&sample?"Stop":"Ask";s.disabled=v&&!sample}

function localAnswer(bubble,q){
  var low=q.toLowerCase().trim();
  if(/^(hi+|hey+|hello+|yo|sup|hola|thanks|thank you|ty|ok|okay|cool|nice)[\s!.?]*$/.test(low)||(/^(hi|hello|hey)\b/.test(low)&&low.split(/\s+/).length<=3)){
    bubble.innerHTML="<p>Hi! I'm OpenERLC. Ask me anything about ER:LC, like teams, ranks, commands, the API or rules.</p>";return}
  var hits=retrieve(q);
  if(!hits.length){bubble.innerHTML="<p>I could not find that in the OpenERLC reference yet. Try asking about teams, ranks, jobs, private servers, commands, the API or roleplay rules, or check the ER:LC Wiki.</p>";return}
  var html="";
  hits.forEach(function(e){html+="<p><b>"+esc(e.q)+"</b></p>"+e.a+"<div class='note'>Source: "+esc(e.s)+"</div>"});
  bubble.innerHTML=html;
}

async function ask(text){
  text=(text||"").trim(); if(!text||busy)return;
  $("in").value=""; grow();
  var ub=addMsg("user"); ub.textContent=text;
  var bb=addMsg("bot");
  bb.innerHTML="<span class='dots'><i></i><i></i><i></i></span>";
  scrollEnd();
  if(!sample){localAnswer(bb,text);scrollEnd();return}
  turns.push({role:"user",content:text});
  var hist=turns.slice(-10); while(hist.length&&hist[0].role!=="user")hist.shift();
  ctl=new AbortController(); setBusy(true);
  var got="";
  try{
    var r=await sample([{role:"user",content:RULES}].concat(hist),{
      cache:false, modelTier:"quick", signal:ctl.signal,
      onText:function(u){got=u.text;bb.innerHTML=md(got);scrollEnd()}
    });
    got=r.text; bb.innerHTML=md(got);
    if(r.truncated){bb.insertAdjacentHTML("beforeend","<div class='note'>Answer was cut short. Ask for less at a time.</div>")}
    turns.push({role:"assistant",content:got});
  }catch(e){
    var code=e&&e.code;
    turns.pop();
    if(code==="cancelled"){
      if(e.text){bb.innerHTML=md(e.text)+"<div class='note'>Stopped.</div>";turns.push({role:"user",content:text},{role:"assistant",content:e.text})}
      else bb.innerHTML="<div class='note'>Stopped.</div>";
    }else if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].indexOf(code)>=0){
      sample=null; localAnswer(bb,text); updateFoot();
    }else if(code==="rate_limited"){
      bb.innerHTML=(e.text?md(e.text):"")+"<div class='note'>Too many questions in a short time or your Claude usage limit was reached. Try again in a moment.</div>";
    }else{
      bb.innerHTML=(e&&e.text?md(e.text):"")+"<div class='note'>That answer was interrupted. Ask again to retry.</div>";
    }
  }finally{ctl=null;setBusy(false);scrollEnd();$("in").focus()}
}

function grow(){var t=$("in");t.style.height="auto";t.style.height=Math.min(t.scrollHeight,144)+"px"}
function updateFoot(){
  $("foot").textContent = sample
    ? "Latest Update Nov 24, 2026. There is no contribution or involvement of PRC & Roblox. There is a possibility that the information may be false, especially if what you are asking is complicated."
    : "Latest Update Nov 24, 2026. There is no contribution or involvement of PRC & Roblox. There is a possibility that the information may be false, especially if what you are asking is complicated.";
}

$("send").onclick=function(){ if(busy&&ctl){ctl.abort()} else ask($("in").value) };
$("in").addEventListener("input",grow);
$("in").addEventListener("keydown",function(ev){
  if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();ask($("in").value)}
});
$("reset").onclick=function(){if(ctl)ctl.abort();turns=[];showHello();$("in").focus()};

var aboutBackdrop=$("about-backdrop");
var visitCount=$("visit-count");

function closeAbout(){aboutBackdrop.hidden=true;$("about").focus()}
function openAbout(){aboutBackdrop.hidden=false;$("about-close").focus()}

$("about").onclick=openAbout;
$("about-close").onclick=closeAbout;
aboutBackdrop.onclick=function(ev){if(ev.target===aboutBackdrop)closeAbout()};
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"&&!aboutBackdrop.hidden)closeAbout()});

function updateVisitCount(value){
  visitCount.textContent=Number(value).toLocaleString();
}

(async function(){
  try{
    var response=await fetch("/api/visits",{method:"POST",cache:"no-store"});
    if(!response.ok)throw new Error("Visit counter unavailable");
    var data=await response.json();
    updateVisitCount(data.visits);
  }catch(e){
    var key="openerlc-local-visits";
    var count=parseInt(localStorage.getItem(key)||"0",10);
    count=(Number.isFinite(count)?count:0)+1;
    localStorage.setItem(key,String(count));
    updateVisitCount(count);
  }
})();

showHello(); updateFoot();
(async function(){
  try{ if(window.claude&&window.claude.use){ sample=await window.claude.use("sample") } }catch(e){ sample=null }
  updateFoot();
})();
