import {db,owner,ready,providerLabel,reply,fail} from '@/lib/server';
import type {Session,SessionSummary} from '@/lib/types';
export async function GET(){try{
 const user=await owner();const rows=await db().prepare('SELECT data FROM sessions WHERE owner = ? ORDER BY updated_at DESC LIMIT 100').bind(user).all<{data:string}>();
 const sessions:SessionSummary[]=rows.results.map(r=>{const s=JSON.parse(r.data) as Session;return {id:s.id,title:s.scene.title,direction:s.scene.direction,sceneId:s.scene.id,status:s.status,updatedAt:s.updatedAt,mode:s.scene.mode,parentSessionId:s.parentSessionId,turns:s.turns.filter(t=>t.attempts.length).length,length:s.length,exercise:s.scene.exercise,skill:s.scene.skill,nextFocus:s.nextFocus,transferFromSessionId:s.scene.transferFromSessionId};});
 const reviews=sessions.filter(s=>s.status==='finished'&&s.mode==='live'&&s.turns>0&&Date.now()-Date.parse(s.updatedAt)>=2*86400000&&!sessions.some(t=>t.transferFromSessionId===s.id&&t.turns>0)).slice(0,3);
 return reply({configured:ready(),providerLabel:providerLabel(),sessions,reviews});
}catch(e){return fail(e);}}
