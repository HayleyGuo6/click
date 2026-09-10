export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export type ModelEnvironment = {
  AI_PROVIDER?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export function modelConfig(env: ModelEnvironment) {
  const provider = env.AI_PROVIDER?.trim() || 'deepseek';
  if (provider === 'deepseek') return {
    provider, label: 'DeepSeek', key: env.DEEPSEEK_API_KEY?.trim(),
    model: env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash',
    endpoint: 'https://api.deepseek.com/responses',
  };
  if (provider === 'openai') return {
    provider, label: 'OpenAI', key: env.OPENAI_API_KEY?.trim(),
    model: env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
    endpoint: 'https://api.openai.com/v1/responses',
  };
  throw new AppError('模型服务配置有误，请检查后再试。', 503);
}

type Schema = Record<string, unknown>;
function matchesSchema(value: unknown, schema: Schema): boolean {
  if (schema.type === 'string') return typeof value === 'string' && value.trim().length > 0;
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return false;
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) return false;
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) return false;
    return value.every(item => matchesSchema(item, schema.items as Schema));
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const object = value as Record<string, unknown>;
    const properties = schema.properties as Record<string, Schema>;
    return (schema.required as string[]).every(key => Object.hasOwn(object, key))
      && Object.keys(object).every(key => Object.hasOwn(properties, key) && matchesSchema(object[key], properties[key]));
  }
  return false;
}

export async function runModel<T>(env: ModelEnvironment, instructions: string, input: unknown, schema: Schema, request: typeof fetch = fetch): Promise<T> {
  const config = modelConfig(env);
  if (!config.key) throw new AppError(`${config.label} 尚未连接，请先使用明确标注的示例体验。`, 503);
  let response: Response;
  try {
    response = await request(config.endpoint, {
      method: 'POST',
      headers: {Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: config.model, store: false, instructions, input: JSON.stringify(input),
        max_output_tokens: 3200,
        ...(config.provider === 'deepseek' ? {reasoning: {effort: 'none'}} : {}),
        text: {format: {type: 'json_schema', name: 'click_result', strict: true, schema}},
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch { throw new AppError('模型暂时未能回应，可以重试。已提交的回答会保留。', 502); }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as {error?: {code?: string; type?: string}};
    const codes = [detail.error?.code, detail.error?.type];
    if (response.status === 402 || codes.some(code => ['billing_not_active', 'insufficient_quota', 'insufficient_balance'].includes(code || '')))
      throw new AppError(`${config.label} 的 API 计费未开通或余额不足，请到对应平台检查计费。已提交的回答会保留。`, 502);
    if (response.status === 401 || response.status === 403)
      throw new AppError(`${config.label} 的密钥或访问权限不可用，请检查配置。`, 502);
    if (response.status === 429) throw new AppError('模型请求暂时过于频繁，请稍后重试。', 502);
    throw new AppError('模型服务暂时不可用，请稍后重试。', 502);
  }
  try {
    const data = await response.json() as {status: string; output?: {content?: {type: string; text?: string}[]}[]};
    const text = data.output?.flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text || '').join('');
    if (data.status !== 'completed' || !text) throw new Error('incomplete');
    const value: unknown = JSON.parse(text);
    if (!matchesSchema(value, schema)) throw new Error('invalid structured output');
    return value as T;
  } catch { throw new AppError('模型返回内容不完整，请重试。已提交的回答会保留。', 502); }
}
