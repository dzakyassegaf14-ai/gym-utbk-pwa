self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(self.clients.claim())});
self.addEventListener("push",e=>{
 let data={title:"Pengingat jadwal",body:"Saatnya menjalankan jadwal harianmu.",url:"/"};
 try{if(e.data)data={...data,...e.data.json()}}catch(_){}
 const opts={body:data.body,icon:"/icon.svg",badge:"/icon.svg",vibrate:[250,100,250],tag:data.tag||"gym-utbk-reminder",renotify:true,data:{url:data.url||"/"}};
 e.waitUntil(self.registration.showNotification(data.title,opts));
});
self.addEventListener("notificationclick",e=>{
 e.notification.close();e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
  for(const c of list){if("focus" in c)return c.focus()}
  return clients.openWindow(e.notification.data.url||"/");
 }));
});