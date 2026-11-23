const defaultTasks = [
  {time:"05.30–06.30",title:"Bangun pagi & persiapan",desc:"Ibadah, minum air, sarapan ringan.",kind:"Rutinitas"},
  {time:"06.30–07.00",title:"Persiapan dan perjalanan gym",desc:"Perjalanan serta pemanasan.",kind:"Gym"},
  {time:"07.00–08.30",title:"GYM",desc:"Latihan beban sesuai program mingguan.",kind:"Gym"},
  {time:"08.30–08.50",title:"Mandi & persiapan belajar",desc:"Siapkan meja dan materi UTBK.",kind:"Rutinitas"},
  {time:"08.50–11.10",title:"PU — Penalaran Umum",desc:"Konsep, latihan ±30 soal, dan pembahasan.",kind:"UTBK"},
  {time:"11.10–13.00",title:"Istirahat",desc:"Makan siang, ibadah, dan aktivitas santai.",kind:"Istirahat"},
  {time:"13.00–Ashar",title:"Tidur siang",desc:"Istirahat sampai waktu Ashar.",kind:"Istirahat"},
  {time:"SETELAH ASHAR",title:"PK — Pengetahuan Kuantitatif",desc:"Latihan ±25 soal sampai pukul 17.30.",kind:"UTBK",dynamic:true},
  {time:"17.30–19.00",title:"Istirahat & makan malam",desc:"Ibadah, makan, dan waktu pribadi.",kind:"Istirahat"},
  {time:"19.00–20.30",title:"PM — Penalaran Matematika",desc:"Latihan ±25 soal dan pembahasan.",kind:"UTBK"},
  {time:"20.30–21.00",title:"Review & evaluasi",desc:"Catat soal salah dan materi yang belum dikuasai.",kind:"UTBK"},
  {time:"21.00–21.30",title:"Persiapan tidur",desc:"Kurangi penggunaan HP.",kind:"Rutinitas"},
  {time:"21.30",title:"Tidur malam",desc:"Target tidur cukup untuk pemulihan.",kind:"Istirahat"}
];
const $ = id => document.getElementById(id);
const key = new Date().toLocaleDateString("en-CA");
let completed = JSON.parse(localStorage.getItem("done-"+key)||"{}");
let ashar = localStorage.getItem("asharTime") || "15:15";
$("asharTime").value = ashar;
$("soundToggle").checked = localStorage.getItem("sound") !== "false";
$("vibrateToggle").checked = localStorage.getItem("vibrate") !== "false";
$("today").textContent = new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"});
function timeToMinutes(t){const m=t.match(/(\d{2})[:.](\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}
function tasks(){return defaultTasks.map(t=>t.dynamic?{...t,time:ashar+"–17.30"}:t)}
function render(){
 const list=$("schedule"); list.innerHTML="";
 tasks().forEach((t,i)=>{
  const row=document.createElement("div"); row.className="item"+(completed[i]?" done":"");
  const time=document.createElement("div");time.className="time";time.textContent=t.time;
  const info=document.createElement("div");const h=document.createElement("h3");h.textContent=t.title;const p=document.createElement("p");p.textContent=t.desc;const tag=document.createElement("span");tag.className="tag";tag.textContent=t.kind;info.append(h,p,tag);
  const check=document.createElement("input");check.type="checkbox";check.checked=!!completed[i];check.setAttribute("aria-label","Tandai "+t.title+" selesai");
  check.addEventListener("change",()=>{completed[i]=check.checked;localStorage.setItem("done-"+key,JSON.stringify(completed));render()});
  row.append(time,info,check);list.append(row);
 });
 const done=Object.values(completed).filter(Boolean).length;const pct=Math.round(done/tasks().length*100);
 $("progressText").textContent=pct+"%";$("progressBar").style.width=pct+"%";
}
function tick(){
 const now=new Date();$("clock").textContent=now.toLocaleTimeString("id-ID",{hour12:false});
 const mins=now.getHours()*60+now.getMinutes();
 const upcoming=[
  [330,"Bangun pagi & persiapan"],[420,"Gym"],[530,"Mulai belajar PU"],[670,"Istirahat"],[780,"Tidur siang"],[timeToMinutes(ashar),"Mulai belajar PK"],[1050,"Istirahat & makan malam"],[1140,"Mulai belajar PM"],[1230,"Review UTBK"],[1290,"Persiapan tidur"]
 ].filter(x=>x[0]!==null&&x[0]>mins).sort((a,b)=>a[0]-b[0]);
 $("nextTask").textContent=upcoming.length?"Berikutnya: "+upcoming[0][1]+" · "+String(Math.floor(upcoming[0][0]/60)).padStart(2,"0")+":"+String(upcoming[0][0]%60).padStart(2,"0"):"Jadwal utama hari ini selesai. Bagus!";
}
$("resetDay").addEventListener("click",()=>{if(confirm("Reset semua checklist hari ini?")){completed={};localStorage.removeItem("done-"+key);render()}});
$("saveAshar").addEventListener("click",()=>{ashar=$("asharTime").value||"15:15";localStorage.setItem("asharTime",ashar);render();tick();});
$("soundToggle").addEventListener("change",()=>localStorage.setItem("sound",$("soundToggle").checked));
$("vibrateToggle").addEventListener("change",()=>localStorage.setItem("vibrate",$("vibrateToggle").checked));

async function registerPush(){
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){
  $("pushStatus").textContent="Browser ini belum mendukung push notification. Coba Chrome Android.";return;
 }
 try{
  const reg=await navigator.serviceWorker.register("/sw.js");
  const permission=await Notification.requestPermission();
  if(permission!=="granted"){$("pushStatus").textContent="Izin notifikasi belum diberikan. Aktifkan melalui pengaturan situs di Chrome.";return}
  const cfg=await fetch("/api/public-key").then(r=>r.json());
  if(!cfg.publicKey){$("pushStatus").textContent="Server push belum dikonfigurasi. Lihat README untuk memasukkan VAPID keys.";return}
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(cfg.publicKey)});
  const saved=await fetch("/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(sub)});
  if(!saved.ok)throw new Error("Gagal menyimpan langganan");
  await fetch("/api/preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({asharTime:ashar})});
  $("pushStatus").textContent="Notifikasi push aktif. Pengingat dikirim dari server meskipun aplikasi ditutup, selama koneksi dan izin tersedia.";
  $("enablePush").textContent="Notifikasi aktif";
 }catch(e){$("pushStatus").textContent="Belum aktif: "+e.message+". Pastikan server HTTPS dan push sudah disiapkan."}
}
function urlBase64ToUint8Array(s){const pad="=".repeat((4-s.length%4)%4);const raw=atob((s+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
$("enablePush").addEventListener("click",registerPush);
if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
render();tick();setInterval(tick,1000);