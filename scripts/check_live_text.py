"""Explicit local live-model acceptance. Uses synthetic practice data and cleans its sessions."""
import json, urllib.request, urllib.error, http.cookiejar, uuid

BASE = 'http://localhost:3000'
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
created = []
def request(path, data=None, method=None):
    req = urllib.request.Request(BASE+path, data=json.dumps(data, ensure_ascii=False).encode() if data is not None else None,
        method=method or ('POST' if data is not None else 'GET'), headers={'Content-Type': 'application/json'})
    try:
        with client.open(req, timeout=90) as response: return json.load(response)
    except urllib.error.HTTPError as error:
        print('API ERROR:', error.code, error.read().decode(), flush=True)
        raise
try:
    client.open(BASE+'/signin-with-chatgpt?return_to=/').read()
    boot = request('/api/bootstrap')
    assert boot['configured'] and boot['providerLabel'] == 'DeepSeek'
    for direction in ['express', 'conflict', 'affection']:
        scene = request('/api/scenes', {'direction': direction})
        assert scene['mode'] == 'live' and scene['opening'] and 'references' not in scene
        print('LIVE SCENE:', direction, scene['title'], flush=True)
        if direction != 'express': continue
        s = request('/api/sessions', {'sceneId': scene['id'], 'goal': '测试情境：说明自己的想法，同时确认对方的需要。'})
        created.append(s['id']); path = '/api/sessions/'+s['id']
        assert s['turns'][0]['attempts'] == []
        first = '我想先听清楚你的具体需要，再说说我现在能做的部分。'
        s = request(path, {'action': 'answer', 'version': s['version'], 'text': first, 'attemptId': str(uuid.uuid4())})
        attempt = s['turns'][0]['attempts'][0]
        assert attempt['mode'] == 'text' and not attempt.get('feedbackError'), attempt.get('feedbackError')
        assert attempt['feedback'].get('answerQuote') in first
        refs = attempt['feedback']['references']
        assert len(refs) == 3 and len({ref['answer'] for ref in refs}) == 3
        print('LIVE FEEDBACK:', attempt['feedback']['evidence'], flush=True)
        rewrite = '我目前能先完成一部分。你最希望我优先处理哪一件事？'
        s = request(path, {'action': 'answer', 'version': s['version'], 'text': rewrite, 'attemptId': str(uuid.uuid4())})
        assert s['turns'][0]['attempts'][0]['text'] == first
        selected = s['turns'][0]['attempts'][-1]
        assert selected['assisted'] and selected.get('feedback'), selected.get('feedbackError')
        assert selected['feedback'].get('answerQuote') in rewrite
        s = request(path, {'action': 'continue', 'version': s['version'], 'attemptId': selected['id']})
        assert s['turns'][0]['selectedId'] == selected['id'] and len(s['turns']) == 2
        print('LIVE REPLY:', s['turns'][-1]['opponent'], flush=True)
        s = request(path, {'action': 'finish', 'version': s['version'], 'note': '自动验收用例，不是个人训练记录。'})
        assert s['status'] == 'finished' and s['summary']
        assert request(path)['summary'] == s['summary']
        repeated = request('/api/sessions', {'sceneId': scene['id'], 'goal': s['goal'], 'parentSessionId': s['id']})
        created.append(repeated['id'])
        assert repeated['id'] != s['id'] and repeated['parentSessionId'] == s['id']
        try: request('/api/audio', {})
        except urllib.error.HTTPError as error: assert error.code == 410
        else: raise AssertionError('Voice upload still enabled')
    print('PASS: live scenes, after-answer feedback, preserved rewrite, selected continuation, saved summary, linked repeat and text-only uploads.', flush=True)
finally:
    for ident in created: request('/api/sessions/'+ident, method='DELETE')
    print('Removed only live acceptance-test sessions.', flush=True)
