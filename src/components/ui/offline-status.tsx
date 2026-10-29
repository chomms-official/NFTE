"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeConnectivity = (changed: () => void) => {
  window.addEventListener('online',changed);window.addEventListener('offline',changed);
  return () => {window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};
};
const subscribeSupport = () => () => {};

type Status = {ready?: boolean; completed?: number; total?: number; demo?: boolean; error?: string; version?: string};
function ask(worker: ServiceWorker, message: object): Promise<Status> {
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();reject(new Error('No offline response'));},6000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
    worker.postMessage(message,[channel.port2]);
  });
}
export function OfflineStatus() {
  const [status,setStatus]=useState<Status>({});
  const online=useSyncExternalStore(subscribeConnectivity,()=>navigator.onLine,()=>true);
  const supported=useSyncExternalStore(subscribeSupport,()=>('serviceWorker' in navigator),()=>true);
  const [open,setOpen]=useState(false),[waiting,setWaiting]=useState(false);
  const registration=useRef<ServiceWorkerRegistration | null>(null);
  const applying=useRef(false);
  const refresh=async()=>{
    if(!('serviceWorker' in navigator))return;
    if(registration.current)setWaiting(!!registration.current.waiting);
    const worker=navigator.serviceWorker.controller;
    if(worker) try {setStatus(await ask(worker,{type:'STATUS'}));} catch { /* Older workers have no status protocol. */ }
  };
  useEffect(()=>{
    if(!('serviceWorker' in navigator))return;
    let disposed=false;
    const message=(event:MessageEvent)=>{
      if(event.data.type==='OFFLINE_PROGRESS') setStatus(previous=>({...previous,...event.data,error:undefined}));
      if(event.data.type==='OFFLINE_STATUS') setStatus(event.data);
      if(event.data.type==='OFFLINE_ERROR') setStatus(previous=>({...previous,error:event.data.message}));
    };
    const changed=()=>{setWaiting(false);if(applying.current) location.reload();else void refresh();};
    const visibility=()=>{if(document.visibilityState==='visible') void refresh();};
    navigator.serviceWorker.addEventListener('message',message);
    navigator.serviceWorker.addEventListener('controllerchange',changed);
    document.addEventListener('visibilitychange',visibility);
    const controller=navigator.serviceWorker.controller;
    if(controller) void ask(controller,{type:'STATUS'}).then(state=>{if(!disposed)setStatus(state);}).catch(()=>{});
    navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
      if(disposed)return;
      registration.current=reg;setWaiting(!!reg.waiting);void refresh();
      reg.addEventListener('updatefound',()=>{
        const installing=reg.installing;
        installing?.addEventListener('statechange',()=>{
          if(disposed)return;
          if(installing.state==='installed') {setWaiting(!!reg.waiting);void refresh();}
          if(installing.state==='redundant') setStatus(previous=>({...previous,error:'Download incomplete. Reconnect and retry.'}));
        });
      });
    }).catch(()=>{if(!disposed)setStatus(previous=>previous.ready?previous:{...previous,error:'Offline preparation failed. Reconnect and retry.'});});
    return ()=>{
      disposed=true;navigator.serviceWorker.removeEventListener('message',message);
      navigator.serviceWorker.removeEventListener('controllerchange',changed);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[]);
  const retry=async()=>{
    setStatus(previous=>({...previous,error:undefined}));
    try {
      if(!registration.current) {location.reload();return;}
      await registration.current.update();setWaiting(!!registration.current.waiting);await refresh();
    }catch{setStatus(previous=>({...previous,error:'Reconnect to finish downloading.'}));}
  };
  const toggleDemo=async()=>{
    const worker=navigator.serviceWorker.controller;if(!worker)return;
    const result=await ask(worker,{type:'SET_DEMO',enabled:!status.demo});setStatus(result);
    if(!result.error) location.reload();
  };
  const update=()=>{
    if(!registration.current?.waiting) {setWaiting(false);void refresh();return;}
    applying.current=true;registration.current.waiting.postMessage({type:'APPLY_UPDATE'});
  };
  const label=!supported?'Offline unavailable':status.demo?'Offline demo mode':!online?(status.ready?'Offline · ready':'Offline · not prepared')
    :waiting?'Offline update ready':status.error?'Offline setup incomplete':status.ready?'Offline ready'
      :`Saving offline${status.total?` ${Math.round((status.completed||0)/status.total*100)}%`:'…'}`;
  return <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[1100] max-w-[92vw] text-xs font-sans">
    {open&&<section aria-label="Offline preparation" className="mb-2 w-80 max-w-[92vw] rounded-xl border border-white/20 bg-zinc-950/95 p-4 text-zinc-200 shadow-xl">
      <h2 className="font-semibold text-white mb-2">Competition offline demo</h2>
      <p>Before travelling, open this site on the device and browser you will present with. Wait for “Offline ready”, then turn off Wi-Fi and reload to rehearse.</p>
      <p className="mt-2 text-zinc-400">Maps, flights, charts and saved country data work offline. External reference links need internet. Keep this browser’s site data.</p>
      {!supported&&<p role="alert" className="mt-2 text-amber-300">Offline preparation needs a browser with service worker support and a secure HTTPS connection.</p>}
      {status.error&&<p role="alert" className="mt-2 text-amber-300">{status.error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {waiting&&<button className="rounded bg-blue-700 px-3 py-2" onClick={update}>Apply update &amp; reload</button>}
        {(status.ready||status.demo)&&<button className="rounded bg-emerald-800 px-3 py-2" onClick={()=>void toggleDemo().catch(()=>setStatus(previous=>({...previous,error:'Could not start the saved demo.'})))}>{status.demo?'Exit offline demo':'Test saved demo'}</button>}
        {supported&&<button className="rounded border border-white/20 px-3 py-2" onClick={()=>void retry()}>Check / retry</button>}
      </div>
      <p className="mt-2 text-zinc-400">You can also install MozzieMap from your browser’s “Install app” or “Add to Home Screen” menu.</p>
    </section>}
    <button aria-expanded={open} onClick={()=>{setOpen(!open);void refresh();}} className={`rounded-full border px-3 py-1.5 shadow-lg bg-zinc-950/90 ${status.ready?'border-emerald-500/40 text-emerald-200':'border-white/25 text-zinc-200'}`}><span role="status">{label}</span></button>
  </div>;
}
