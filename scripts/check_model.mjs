import test from 'node:test';
import assert from 'node:assert/strict';
import {modelConfig, runModel} from '../lib/model.ts';

const env = {DEEPSEEK_API_KEY: 'test-deepseek-only', OPENAI_API_KEY: 'test-openai-only'};
const schema = {type: 'object', properties: {answer: {type: 'string'}}, required: ['answer'], additionalProperties: false};
const output = value => Response.json({status: 'completed', output: [{content: [{type: 'output_text', text: JSON.stringify(value)}]}]});

test('DeepSeek does not fall back to a pre-existing OpenAI credential', async () => {
  assert.equal(modelConfig({OPENAI_API_KEY: env.OPENAI_API_KEY}).key, undefined);
  await assert.rejects(runModel({OPENAI_API_KEY: env.OPENAI_API_KEY}, '', {}, schema, () => {
    assert.fail('A request must not be made with the old provider key');
  }), /DeepSeek 尚未连接/);
  assert.throws(() => modelConfig({AI_PROVIDER: 'unknown'}), /配置有误/);
});

test('Requests use only the selected provider and preserve structured output requirements', async () => {
  for (const provider of ['deepseek', 'openai']) {
    const result = await runModel({...env, AI_PROVIDER: provider}, '按实际原话反馈', {answer: '先让我说完。'}, schema, async (url, options) => {
      assert.equal(new URL(url).hostname, provider === 'deepseek' ? 'api.deepseek.com' : 'api.openai.com');
      assert.equal(options.headers.Authorization, `Bearer ${provider === 'deepseek' ? env.DEEPSEEK_API_KEY : env.OPENAI_API_KEY}`);
      const body = JSON.parse(options.body);
      assert.deepEqual(body.text.format.schema, schema);
      assert.equal(body.store, false);
      assert.equal(JSON.parse(body.input).answer, '先让我说完。');
      if (provider === 'deepseek') assert.equal(body.reasoning.effort, 'none');
      return output({answer: '我想把这个想法讲完整，再听听你的意见。'});
    });
    assert.ok(result.answer);
  }
});

test('Billing failures do not invite rate-limit retries or expose upstream secrets', async () => {
  for (const [status, code, match] of [[402, 'insufficient_balance', /计费/], [429, 'billing_not_active', /计费/], [429, 'insufficient_quota', /计费/], [429, 'rate_limit_exceeded', /过于频繁/], [401, 'invalid_api_key', /密钥或访问权限/]]) {
    await assert.rejects(runModel(env, '', {}, schema, async () => Response.json({error: {code, message: env.DEEPSEEK_API_KEY}}, {status})), e => {
      assert.match(e.message, match);
      assert.ok(!e.message.includes(env.DEEPSEEK_API_KEY));
      return true;
    });
  }
});

test('Malformed, incomplete and wrong-shaped model data is never accepted as feedback', async () => {
  for (const response of [output({answer: 42}), output({answer: ''}), output({wrong: 'field'}), output({answer: 'text', extra: 'field'}), Response.json({status: 'incomplete', output: []}), new Response('not json')]) {
    await assert.rejects(runModel(env, '', {}, schema, async () => response), /内容不完整/);
  }
  const references = {type: 'object', properties: {references: {type: 'array', minItems: 3, maxItems: 3, items: {type: 'string'}}}, required: ['references']};
  await assert.rejects(runModel(env, '', {}, references, async () => output({references: ['one']})), /内容不完整/);
});
