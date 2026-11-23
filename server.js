const express=require("express");
const webpush=require("web-push");
const fs=require("fs");
const path=require("path");
const app=express();
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));
const DATA=path.join(__dirname,"data.json");
const data=fs.existsSync(DATA)?JSON.parse(fs.readFileSync(DATA,"utf8")):{subscriptions:[],asharTime:"15:15",sent:{}};
const save=()=>fs.writeFileSync(DATA,JSON.stringify(data,null,2));
const pub=process.env.VAPID_PUBLIC_KEY,priv=process.env.VAPID_PRIVATE_KEY;
if(pub&&priv)webpush.setVapidDetails(process.env.VAPID_SUBJECT||"mailto:admin@example.com",pub,priv);
app.get("/api/public-key",(req,res)=>res.json({publicKey:pub||null}));
app.post("/api/subscribe",(req,res)=>{
 const s=req.body;if(!s||!s.endpoint)return res.status(400).json({error:"Invalid subscription"});
 if(!data.subscriptions.some(x=>x.endpoint===s.endpoint))data.subscriptions.push(s);
 save();res.json({ok:true});
});
app.post("/api/preferences",(req,res)=>{
 if(typeof req.body.asharTime==="string"&&/^\d{2}:\d{2}$/.test(req.body.asharTime))data.asharTime=req.body.asharTime;
 save();res.json({ok:true});
});
const schedule=[
 ["05:30","Bangun pagi & persiapan","Saatnya bangun, ibadah, minum air, dan sarapan ringan."],
 ["06:30","Persiapan gym","Siapkan perlengkapan dan berangkat gym."],
 ["07:00","Waktunya GYM","Mulai latihan beban sesuai program hari ini."],
 ["08:30","Pemulihan setelah gym","Mandi, sarapan, dan persiapkan materi UTBK."],
 ["08:50","Mulai belajar PU","Fokus Penalaran Umum. Target sekitar 30 soal + pembahasan."],
 ["11:10","Waktunya istirahat","Berhenti belajar. Makan siang, ibadah, dan santai."],
 ["13:00","Waktunya tidur siang","Istirahat sampai waktu Ashar."],
 ["17:30","Akhir sesi PK","Selesaikan sesi Pengetahuan Kuantitatif dan istirahat."],
 ["19:00","Mulai belajar PM","Fokus Penalaran Matematika."],
 ["20:30","Review UTBK","Evaluasi soal salah dan catat materi yang belum dikuasai."],
 ["21:00","Persiapan tidur","Kurangi layar dan bersiap tidur."],
 ["21:30","Waktunya tidur malam","Istirahat untuk pemulihan tubuh dan otak."]
];
function todayKey(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function localParts(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
 const o={};parts.forEach(p=>o[p.type]=p.value);return {hour:o.hour,minute:o.minute};
}
async function send(title,body,tag){
 if(!pub||!priv||!data.subscriptions.length)return;
 const payload=JSON.stringify({title,body,tag,url:"/"});
 const results=await Promise.allSettled(data.subscriptions.map(s=>webpush.sendNotification(s,payload)));
 const expired=[];
 results.forEach((r,i)=>{if(r.status==="rejected"&&(r.reason.statusCode===404||r.reason.statusCode===410))expired.push(i)});
 if(expired.length){data.subscriptions=data.subscriptions.filter((_,i)=>!expired.includes(i));save()}
}
setInterval(()=>{
 const now=localParts(),hm=now.hour+":"+now.minute,day=todayKey();
 const dynamic=[
  [data.asharTime,"Mulai belajar PK","Waktunya Pengetahuan Kuantitatif. Fokus latihan dan pembahasan sampai 17.30."]
 ];
 for(const [time,title,body] of [...schedule,...dynamic]){
  const id=day+"_"+time;
  if(hm===time&&!data.sent[id]){
   data.sent[id]=true;save();send(title,body,id);
  }
 }
 // Keep only recent sent markers
 for(const k of Object.keys(data.sent))if(!k.startsWith(day))delete data.sent[k];
},15000);
const port=process.env.PORT||3000;
app.listen(port,()=>console.log("Gym + UTBK app listening on "+port));