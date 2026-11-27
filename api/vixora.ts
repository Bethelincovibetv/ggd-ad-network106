import { handleVixoraApiRequest } from '../src/lib/vixoraServerHandler';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, apikey, X-Requested-With, x-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  let parsedBody: any = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  try {
    const result = await handleVixoraApiRequest({
      method: req.method,
      url: req.url,
      body: parsedBody,
      env: process.env,
    });
    return res.status(result.status).json(result.body);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Unexpected Vixora serverless error.',
    });
  }
}
