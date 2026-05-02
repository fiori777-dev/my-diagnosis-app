// api/chat.js
// =========================================================
// Vercel Serverless Function
// 役割：APIキーを隠しながらClaudeへリクエストを中継する「盾」
// =========================================================

export default async function handler(req, res) {

  // ----- CORS設定（自分のドメインだけ許可する場合は origin を変更）-----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // プリフライトリクエスト（ブラウザが事前に送るOPTIONS）への応答
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST以外は拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ----- リクエストの検証 -----
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt が不正です' });
  }

  // プロンプトが長すぎる場合は拒否（悪用対策）
  if (prompt.length > 3000) {
    return res.status(400).json({ error: 'prompt が長すぎます' });
  }

  // ----- Claude API へ中継 -----
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Vercelの環境変数に隠したキー
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // 最新モデルを使用
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    // Claude APIがエラーを返した場合
    if (!response.ok) {
      const errBody = await response.text();
      console.error('Claude API error:', response.status, errBody);
      return res.status(502).json({ error: 'Claude APIでエラーが発生しました' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
  }
}
