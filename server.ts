import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Authentication endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  const validUsername = 'Buoibeo';
  const validPassword = 'AnhThuoi';

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  if (username.trim() === validUsername && password === validPassword) {
    return res.json({
      success: true,
      user: {
        username: validUsername,
        name: 'TS. Buoibeo',
        role: 'Trưởng Phòng Thí Nghiệm Vật Lý',
        institution: 'Viện Nghiên cứu Vật lý Ứng dụng & Lý sinh',
        avatar: '🔬',
        accessLevel: 'Superuser / Lead Physicist',
      },
      token: `token_${Date.now()}_buoibeo_auth`,
    });
  }

  return res.status(401).json({
    error: 'Tên đăng nhập hoặc mật khẩu không chính xác. (Gợi ý: Tên đăng nhập: Buoibeo / Mật khẩu: AnhThuoi)',
  });
});

// Gemini Physics AI Explanation & Reasoning Endpoint
app.post('/api/gemini/explain', async (req: Request, res: Response) => {
  try {
    const { prompt, mode = 'general', experimentData } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu câu hỏi hoặc yêu cầu phân tích.' });
    }

    const contextString = experimentData
      ? `\n\n[DỮ LIỆU THÍ NGHIỆM THỜI GIAN THỰC]:\n${JSON.stringify(experimentData, null, 2)}`
      : '';

    const systemInstruction = `Bạn là Trợ lý Giáo sư Vật lý & Khoa học Tự nhiên cấp cao của phòng thí nghiệm PhyLab Pro.
Bạn giao tiếp bằng tiếng Việt chuẩn mực, sư phạm, nhiệt huyết, giàu tính khoa học và trực quan.
Nhiệm vụ của bạn:
1. Giải thích cặn kẽ bản chất vật lý của hiện tượng đang diễn ra trong thí nghiệm.
2. Nêu rõ các định luật, công thức toán lý liên quan (dùng ký hiệu LaTeX hoặc công thức rõ ràng như E = 1/2 k x^2, T = 2π√(l/g), F = m.a, n1 sin i = n2 sin r,...).
3. Phân tích tác động của các tham số hiện tại (khối lượng, chiều dài, gia tốc trọng trường g, góc ném, chiết suất, nhiệt độ, v.v.).
4. Khi giải thích sâu, liên hệ với các ứng dụng thực tế trong đời sống, kĩ thuật và lý sinh học (biophysics).
5. Trình bày khoa học với các gạch đầu dòng, tiêu đề rõ ràng.`;

    const fullPrompt = `${prompt}${contextString}`;

    let textOutput = '';
    let usedModel = 'gemini-3.8-flash';

    if (mode === 'deep-thinking') {
      usedModel = 'gemini-4-argon';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: fullPrompt,
          config: {
            systemInstruction,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        });
        textOutput = response.text || 'Không nhận được phản hồi từ mô hình.';
      } catch (err: any) {
        console.warn('Gemini 4 Argon failed, falling back to gemini-3.8-flash with high thinking:', err?.message);
        usedModel = 'gemini-3.8-flash (fallback)';
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: fullPrompt,
          config: {
            systemInstruction: `${systemInstruction}\n(Chế độ suy luận sâu: Hãy tư duy từng bước step-by-step logic, giải trình chi tiết toán học và vật lý)`,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        });
        textOutput = response.text || 'Không nhận được phản hồi từ mô hình.';
      }
    } else if (mode === 'fast') {
      usedModel = 'gemini-3.1-flash-lite';
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: fullPrompt,
        config: {
          systemInstruction: 'Bạn là chuyên gia vật lý tóm lược nhanh gọn, súc tích trong 3-5 gạch đầu dòng chính xác.',
        },
      });
      textOutput = response.text || '';
    } else {
      // General mode
      usedModel = 'gemini-3.8-flash';
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
        },
      });
      textOutput = response.text || '';
    }

    return res.json({
      text: textOutput,
      modelUsed: usedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Explain Error:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi xử lý yêu cầu AI.',
    });
  }
});

// Gemini Interactive Physics Quiz Generator Endpoint
app.post('/api/gemini/quiz', async (req: Request, res: Response) => {
  try {
    const { experimentType, parameters } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Hãy tạo 3 câu hỏi trắc nghiệm hoặc bài tập tình huống vật lý liên quan trực tiếp đến thí nghiệm: ${experimentType || 'Cơ học & Dao động'} với các thông số hiện tại: ${JSON.stringify(parameters || {})}. 
Mỗi câu hỏi phải có 4 phương án lựa chọn, chỉ rõ đáp án đúng và lời giải thích chi tiết vì sao đúng bằng hiện tượng vật lý.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Danh sách các câu hỏi trắc nghiệm vật lý',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING, description: 'Nội dung câu hỏi' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 lựa chọn A, B, C, D',
              },
              correctIndex: { type: Type.INTEGER, description: 'Chỉ số phương án đúng (0, 1, 2, 3)' },
              explanation: { type: Type.STRING, description: 'Giải thích chi tiết vì sao phương án đó đúng' },
            },
            required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    return res.json({ quiz: parsed });
  } catch (error: any) {
    console.error('Gemini Quiz Error:', error);
    return res.status(500).json({ error: error?.message || 'Không thể tạo bài tập trắc nghiệm.' });
  }
});

// Science skill: arXiv scientific literature proxy for physics & biophysics research
app.get('/api/science/arxiv', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || 'physics pendulum harmonic oscillator';
    const maxResults = Math.min(parseInt((req.query.max as string) || '4', 10), 10);
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    const fetchRes = await fetch(arxivUrl);
    if (!fetchRes.ok) {
      throw new Error(`arXiv API responded with status ${fetchRes.status}`);
    }
    const xmlText = await fetchRes.text();

    // Simple robust regex parsing of arXiv Atom XML entries
    const entries: Array<{ id: string; title: string; summary: string; published: string; authors: string[]; link: string }> = [];
    const entryMatches = xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

    for (const match of entryMatches) {
      const entryXml = match[1];
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/);
      const pubMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/);
      const authorMatches = [...entryXml.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)];

      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Không có tiêu đề';
      const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';
      const id = idMatch ? idMatch[1].trim() : '';
      const published = pubMatch ? pubMatch[1].trim().slice(0, 10) : '';
      const authors = authorMatches.map((m) => m[1].trim()).slice(0, 3);

      entries.push({
        id,
        title,
        summary,
        published,
        authors,
        link: id,
      });
    }

    return res.json({ articles: entries });
  } catch (error: any) {
    console.error('arXiv proxy error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi tra cứu tài liệu arXiv.' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const http = await import('http');
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PhyLab Pro Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
