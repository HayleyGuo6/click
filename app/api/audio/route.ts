import {checkRequest,owner,reply,fail} from '@/lib/server';
// Keep a clear response for pages left open before the text-only release.
export async function POST(req:Request){try{checkRequest(req);await owner();return reply({error:'当前版本仅支持文字训练，请刷新页面后继续。'},410);}catch(e){return fail(e);}}
