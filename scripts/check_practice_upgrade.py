"""Local acceptance for practice upgrades; synthetic sessions only, no secrets printed."""
import json, urllib.request, urllib.error, http.cookiejar, uuid
BASE = 'http://localhost:3000'
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
created = []
def request(path, data=None, method=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(data, ensure_ascii=False).encode() if data is not None else None,
        method=method or ('POST' if data is not None else 'GET'), headers={'Content-Type': 'application/json'})
    with client.open(req, timeout=100) as response: return json.load(response)
def expect_error(path, data, code, method=None):
    try: request(path, data, method)
    except urllib.error.HTTPError as error:
        assert error.code == code, (error.code, error.read().decode())
        return
    raise AssertionError('Expected error '+str(code))
def session(scene, length='quick'):
    s = request('/api/sessions', {'sceneId': scene['id'], 'goal': scene['goal'], 'length': length})
    created.append(s['id']); return s
def act(s, action, **data):
    return request('/api/sessions/'+s['id'], {'version': s['version'], 'action': action, **data})
def answer(s, text):
    s=act(s,'answer',text=text,attemptId=str(uuid.uuid4()))
    a=s['turns'][-1]['attempts'][-1]
    assert a.get('feedback'),a.get('feedbackError')
    assert a['feedback']['answerQuote'] in text
    assert len(a['feedback']['interpretation'].strip()) >= 8
    assert a['feedback']['evidence'].strip()
    assert len(a['feedback']['references'])==3
    return s
try:
    try: urllib.request.urlopen(BASE+'/api/sessions/missing/draft?turnId=x&index=0')
    except urllib.error.HTTPError as error: assert error.code==401
    else: raise AssertionError('Anonymous draft access accepted')
    client.open(BASE+'/signin-with-chatgpt?return_to=/').read()
    assert request('/api/bootstrap')['configured']
    raw={'relationship':'朋友（虚构验收）','context':'你们原定今晚吃饭，但你工作后很累，决定今晚休息。','opening':'你怎么又不来了？','goal':'说明今晚想休息，同时表达对这段友谊的在意。'}
    scene=request('/api/scenes',{'direction':'express','custom':raw})
    assert scene['custom'] and all(scene[k]==v for k,v in raw.items())
    s=session(scene);path='/api/sessions/'+s['id'];turn=s['turns'][-1]
    assert s['length']=='quick' and not turn['attempts']
    draft_path=path+'/draft';query='?turnId='+turn['id']+'&index=0'
    assert request(draft_path+query)=={'text':'','revision':0}
    payload={'turnId':turn['id'],'index':0,'text':'我今晚真的很累，想在家休息。','revision':0}
    expect_error(draft_path,{**payload,'revision':3},409,'PUT')
    assert request(draft_path,payload,'PUT')['revision']==1
    expect_error(draft_path,payload,409,'PUT')
    assert request(draft_path+query)['text']==payload['text']
    assert not request(path)['turns'][0]['attempts']
    expect_error('/api/sessions/not-my-session/draft?turnId=x&index=0',None,404)
    print('PASS: exact custom facts; quick mode; draft restoration, stale-write protection and access checks.',flush=True)
    s=answer(s,payload['text']);first=s['turns'][0]['attempts'][0]
    expect_error(draft_path+query,None,409)
    assert request(draft_path+'?turnId='+turn['id']+'&index=1')['text']==''
    s=act(s,'style',reason='太正式',attemptId=first['id'])
    adjusted=s['turns'][0]['attempts'][0]
    assert adjusted['text']==first['text'] and len(adjusted['feedbackRevisions'])==1
    s=answer(s,'我今天有点撑不住，今晚想先休息。你愿意的话，我们之后再约个都方便的时间。')
    assert s['turns'][0]['attempts'][0]['text']==first['text']
    assert s['turns'][0]['attempts'][1]['assisted']
    s=act(s,'finish',attemptId=first['id'],nextFocus='表达自己的安排，同时保留关心',note='虚构验收记录')
    assert s['status']=='finished' and s['turns'][0]['selectedId']==first['id']
    assert request(path)['nextFocus']==s['nextFocus']
    expect_error(draft_path,{**payload,'index':2},409,'PUT')
    print('PASS: real feedback, three references, preserved style revision and rewrite; finish honors selected original.',flush=True)
    transfer=request('/api/scenes',{'direction':'affection','transferFromSessionId':s['id']})
    assert transfer['id']!=scene['id'] and transfer['direction']=='express'
    assert transfer['transferFromSessionId']==s['id'] and transfer['skill']==s['nextFocus']
    t=session(transfer)
    assert t['scene']['transferFromSessionId']==s['id'] and not t['turns'][0]['attempts']
    assert t['coachingPreference']==s['coachingPreference']
    understand=request('/api/scenes',{'direction':'affection','exercise':'understand'})
    u=session(understand,'dialogue');assert u['length']=='quick'
    u=answer(u,'我只能确定对方说了这句话。对方是在开玩笑还是认真询问，目前都只是猜测；我想先问清楚对方的意思。')
    expect_error('/api/sessions/'+u['id'],{'version':u['version'],'action':'continue','attemptId':u['turns'][0]['attempts'][0]['id']},400)
    repair=request('/api/scenes',{'direction':'conflict','exercise':'repair'})
    assert repair['exercise']=='repair' and repair['context'] and repair['opening']
    boot=request('/api/bootstrap');assert any(x.get('transferFromSessionId')==s['id'] for x in boot['sessions'])
    assert all(r['status']=='finished' and r['turns']>0 and r['mode']=='live' for r in boot['reviews'])
    print('PASS: linked new-context practice, remembered style, understanding task and repair scene.',flush=True)
finally:
    for ident in created: request('/api/sessions/'+ident,method='DELETE')
    print('Removed only acceptance-test sessions.',flush=True)
