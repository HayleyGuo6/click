"""Local integration checks. Creates and deletes only its own test sessions."""
import json,urllib.request,urllib.error,http.cookiejar,uuid
BASE='http://localhost:3000'
jar=http.cookiejar.CookieJar(); client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
created=[]
def request(path,data=None,method=None,headers=None):
    req=urllib.request.Request(BASE+path,data=json.dumps(data,ensure_ascii=False).encode() if data is not None else None,method=method or ('POST' if data is not None else 'GET'),headers={'Content-Type':'application/json',**(headers or {})})
    with client.open(req,timeout=90) as r:return json.load(r)
def error(path,data,status,headers=None):
    try:request(path,data,headers=headers)
    except urllib.error.HTTPError as e:assert e.code==status,(e.code,e.read());return
    raise AssertionError('expected failure')
try:
    try:urllib.request.urlopen(BASE+'/api/bootstrap')
    except urllib.error.HTTPError as e:assert e.code==401
    client.open(BASE+'/signin-with-chatgpt?return_to=/').read()
    boot=request('/api/bootstrap');assert boot['configured'] is False,'Only run this fixture check without a live model key'
    error('/api/scenes',{'direction':'invalid'},400)
    error('/api/scenes',{'direction':'express'},403,{'Sec-Fetch-Site':'cross-site'})
    for direction in ['express','conflict','affection']:
        scene=request('/api/scenes',{'direction':direction});assert scene['direction']==direction and scene['mode']=='sample'
        s=request('/api/sessions',{'sceneId':scene['id'],'goal':'本地功能检查：清楚表达本意'});created.append(s['id']);path='/api/sessions/'+s['id']
        assert s['turns'][0]['attempts']==[], 'No reference may exist before answering'
        aid=str(uuid.uuid4()); original='我想先确认你具体指的是什么，再把我的意思说清楚。'
        s=request(path,{'action':'answer','version':s['version'],'text':original,'attemptId':aid})
        assert s['turns'][0]['attempts'][0]['text']==original and len(s['turns'][0]['attempts'][0]['feedback']['references'])==3
        duplicate=request(path,{'action':'answer','version':0,'text':original,'attemptId':aid});assert len(duplicate['turns'][0]['attempts'])==1
        aid2=str(uuid.uuid4());s=request(path,{'action':'answer','version':s['version'],'text':'我愿意一起讨论，也想保留自己的安排。','attemptId':aid2})
        assert len(s['turns'][0]['attempts'])==2 and s['turns'][0]['attempts'][1]['assisted'] is True
        oldversion=s['version'];s=request(path,{'action':'continue','version':s['version'],'attemptId':aid2});assert len(s['turns'])==2 and s['turns'][0]['selectedId']==aid2
        error(path,{'action':'continue','version':oldversion,'attemptId':aid2},409)
        reread=request(path);assert reread==s
        s=request(path,{'action':'fork','version':s['version'],'turnId':s['turns'][0]['id']})
        assert len(s['turns'])==1 and len(s['branches'][0]['turns'])==2 and 'selectedId' not in s['turns'][0]
        s=request(path,{'action':'finish','version':s['version'],'note':'接口检查记录'});assert s['status']=='finished'
        s2=request('/api/sessions',{'sceneId':scene['id'],'goal':s['goal'],'parentSessionId':s['id']});created.append(s2['id'])
        assert s2['id']!=s['id'] and s2['parentSessionId']==s['id'] and request(path)['status']=='finished'
    error('/api/audio',{},410)
    s=request('/api/sessions/'+created[-1]);error('/api/sessions/'+s['id'],{'action':'answer','version':s['version'],'text':'只支持文字','audioId':'legacy-recording','attemptId':str(uuid.uuid4())},400)
    assert request('/api/sessions/'+s['id'])['turns'][0]['attempts']==[]
    print('PASS: three directions; references only after submit; preserved retries; idempotency; conflicts; branches; saved records; separate repeat sessions; voice uploads and submissions disabled.')
finally:
    for ident in created:
        request('/api/sessions/'+ident,method='DELETE')
    print('Removed only integration-test sessions.')
