'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from './types';
type DraftContext={key:string;sessionId:string;turnId:string;index:number};
export function usePracticeDraft(session:Session|null){
 const turn=session?.turns.at(-1);
 const context:DraftContext|null=session?.status==='active'&&turn&&!turn.selectedId?{key:`${session.id}:${turn.id}:${turn.attempts.length}`,sessionId:session.id,turnId:turn.id,index:turn.attempts.length}:null;
 const key=context?.key||'';
 const [text,setText]=useState(''),[state,setState]=useState(''),[ready,setReady]=useState(false),[restored,setRestored]=useState(false),[reloadCount,setReloadCount]=useState(0);
 const active=useRef<DraftContext|null>(null),value=useRef(''),saved=useRef(''),revision=useRef(0),loaded=useRef(false),queue=useRef<Promise<void>>(Promise.resolve()),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const save=useCallback(async()=>{
  if(timer.current)clearTimeout(timer.current);
  const captured=active.current;
  if(!captured||!loaded.current)return;
  const job=queue.current.catch(()=>{}).then(async()=>{
   if(active.current?.key!==captured.key||value.current===saved.current)return;
   const writing=value.current;setState('正在保存草稿…');
   const response=await fetch(`/api/sessions/${captured.sessionId}/draft`,{method:'PUT',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({turnId:captured.turnId,index:captured.index,text:writing,revision:revision.current})});
   const result=await response.json() as {error?:string;revision:number};
   if(!response.ok)throw new Error(result.error||'草稿暂未保存，请保留当前页面。');
   if(active.current?.key!==captured.key)return;
   revision.current=result.revision;saved.current=writing;setState(writing?'草稿已保存':'');
  });
  queue.current=job;
  try{await job;}catch(e){if(active.current?.key===captured.key)setState(e instanceof Error?e.message:'草稿暂未保存');throw e;}
 },[]);
 useEffect(()=>{
  active.current=context;value.current='';saved.current='';revision.current=0;loaded.current=false;setText('');setState(context?'正在恢复草稿…':'');setRestored(false);setReady(false);
  if(timer.current)clearTimeout(timer.current);
  if(!context)return;
  const captured=context;let cancelled=false;
  void fetch(`/api/sessions/${context.sessionId}/draft?turnId=${context.turnId}&index=${context.index}`).then(async r=>{const d=await r.json() as {error?:string;text:string;revision:number};if(!r.ok)throw new Error(d.error||'草稿暂未打开');return d;}).then(d=>{if(cancelled||active.current?.key!==captured.key)return;value.current=d.text;saved.current=d.text;revision.current=d.revision;loaded.current=true;setText(d.text);setRestored(Boolean(d.text));setReady(true);setState(d.text?'已恢复保存的草稿':'');}).catch(e=>{if(!cancelled)setState(e.message);});
  return()=>{cancelled=true;};
 // The key identifies one unsent attempt; unrelated session updates must not reset it.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,reloadCount]);
 function change(next:string){value.current=next;setText(next);setState('草稿待保存');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void save().catch(()=>{}),500);}
 useEffect(()=>{const flush=()=>void save().catch(()=>{});const visibility=()=>{if(document.visibilityState==='hidden')flush();};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility);};},[save]);
 return {text,change,save,state,ready,restored,reload:()=>setReloadCount(n=>n+1)};
}
