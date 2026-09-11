import {body,db,owner,sessionFor,str,reply,fail,AppError} from '@/lib/server';
type Context={params:Promise<{id:string}>};
async function context(id:string,user:string,turnId:string,index:number){
 const s=await sessionFor(id,user);const t=s.turns.at(-1)!;
 if(s.status!=='active'||t.id!==turnId||t.attempts.length!==index||t.selectedId)throw new AppError('回答节点已更新。请重新打开记录；当前文字可先复制保留。',409);
 return `${s.id}:${t.id}:${index}`;
}
export async function GET(req:Request,ctx:Context){try{
 const user=await owner();const url=new URL(req.url);const sid=(await ctx.params).id;
 const key=await context(sid,user,str(url.searchParams.get('turnId'),100),Number(url.searchParams.get('index')));
 const row=await db().prepare('SELECT text, revision FROM practice_drafts WHERE id = ? AND owner = ?').bind(key,user).first<{text:string;revision:number}>();
 return reply(row||{text:'',revision:0});
}catch(e){return fail(e);}}
export async function PUT(req:Request,ctx:Context){try{
 const user=await owner();const data=await body(req);const sid=(await ctx.params).id;
 if(typeof data.text!=='string'||data.text.length>4000||!Number.isInteger(data.revision)||data.revision<0)throw new AppError('草稿内容无效。');
 const key=await context(sid,user,str(data.turnId,100),data.index);
 const now=new Date().toISOString();
 const r=data.revision===0
  ?await db().prepare('INSERT OR IGNORE INTO practice_drafts (id, session_id, owner, text, revision, updated_at) VALUES (?, ?, ?, ?, 1, ?)').bind(key,sid,user,data.text,now).run()
  :await db().prepare('UPDATE practice_drafts SET text = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner = ? AND revision = ?').bind(data.text,now,key,user,data.revision).run();
 if(!r.meta.changes)throw new AppError('草稿已在另一处更新。请先复制当前文字，再重新打开记录。',409);
 return reply({revision:data.revision+1});
}catch(e){return fail(e);}}
