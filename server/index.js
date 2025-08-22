// server/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

// Load .env from /server first; if not found, fall back to project root
const envLoaded =
  dotenv.config().parsed ||
  dotenv.config({ path: path.resolve(__dirname, '../.env') }).parsed;

const app = express();
const PORT = process.env.PORT || 5000;

const HF_MODEL =
  process.env.HF_MODEL || 'stabilityai/stable-diffusion-2-1'; // easy to swap
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    model: HF_MODEL,
    tokenLoaded: Boolean(HF_TOKEN),
    envLoaded: Boolean(envLoaded),
  });
});

app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Bad request: prompt is required.' });
  }

  // If no token, fail fast with a clear message
  if (!HF_TOKEN) {
    return res.status(500).json({
      error:
        'Hugging Face token not found. Put HUGGINGFACE_API_KEY in /server/.env (or project root) and restart the server.',
    });
  }

  try {
    console.log('👉 Prompt received:\n', prompt);

    const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
    const response = await axios.post(
      url,
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60_000,
      }
    );

    const imageBase64 = Buffer.from(response.data).toString('base64');
    return res.status(200).json({ imageBase64 });
  } catch (error) {
    const status = error?.response?.status;
    const statusText = error?.response?.statusText || '';
    console.error('🔥 HuggingFace API error:', status, statusText);

    // Helpful diagnostics for the client/UI
    let hint = 'Image generation failed.';
    if (status === 401) {
      hint =
        'Unauthorized: Check your HUGGINGFACE_API_KEY and that you accepted the model terms on huggingface.co.';
    } else if (status === 403) {
      hint =
        'Forbidden: Token lacks access to this model. Try another model or accept the license.';
    }

    // Send structured error with hint so the client can show a message or fallback
    return res.status(500).json({
      error: hint,
      details: { status, statusText },
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});


