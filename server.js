import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { URL } from 'node:url';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const KB_PATH = join(DATA_DIR, 'knowledge-base.json');
const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

await loadEnv();

const config = {
  port: Number(process.env.PORT || 3000),
  syncSecret: process.env.SYNC_SECRET || '',
  feishuAppId: process.env.FEISHU_APP_ID || '',
  feishuAppSecret: process.env.FEISHU_APP_SECRET || '',
  wikiNodeTokens: listEnv('FEISHU_WIKI_NODE_TOKENS'),
  wikiSpaceId: process.env.FEISHU_WIKI_SPACE_ID || '',
  wikiRootNodeToken: process.env.FEISHU_WIKI_ROOT_NODE_TOKEN || '',
  wikiMaxDepth: Number(process.env.FEISHU_WIKI_MAX_DEPTH || 4),
  docxDocumentIds: listEnv('FEISHU_DOCX_DOCUMENT_IDS'),
  modelApiUrl: process.env.MODEL_API_URL || '',
  modelApiKey: process.env.MODEL_API_KEY || '',
  modelName: process.env.MODEL_NAME || 'gpt-4o-mini'
};

if (process.argv.includes('--sync-feishu')) {
  syncFeishuKnowledgeBase()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
} else {
  createServer(handleRequest).listen(config.port, () => {
    console.log(`FCLAB site running at http://localhost:${config.port}`);
  });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/kb/status') {
      const kb = await readKnowledgeBase();
      return sendJson(res, 200, {
        ok: true,
        documents: kb.documents.length,
        chunks: kb.chunks.length,
        syncedAt: kb.syncedAt || null
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/sync/feishu') {
      requireSyncSecret(req);
      const result = await syncFeishuKnowledgeBase();
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (req.method === 'POST' && url.pathname === '/api/ask') {
      const body = await readJson(req);
      const question = String(body.question || '').trim();

      if (!question) {
        return sendJson(res, 400, { ok: false, error: 'question is required' });
      }

      const answer = await answerQuestion(question);
      return sendJson(res, 200, { ok: true, ...answer });
    }

    return serveStatic(req, res, url.pathname);
  } catch (error) {
    const status = error.statusCode || 500;
    return sendJson(res, status, {
      ok: false,
      error: status === 500 ? 'internal server error' : error.message,
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}

async function syncFeishuKnowledgeBase() {
  if (!config.feishuAppId || !config.feishuAppSecret) {
    throw userError('Missing FEISHU_APP_ID or FEISHU_APP_SECRET', 400);
  }

  const client = createFeishuClient();
  const documents = [];
  const seenDocIds = new Set();

  for (const nodeToken of config.wikiNodeTokens) {
    const node = await client.getWikiNode(nodeToken);
    await collectNodeDocument(client, node, documents, seenDocIds);
  }

  if (config.wikiSpaceId) {
    const rootNodes = await client.listWikiNodes(config.wikiSpaceId, config.wikiRootNodeToken);
    await collectWikiTree(client, rootNodes, documents, seenDocIds, 1);
  }

  for (const documentId of config.docxDocumentIds) {
    await collectDocxDocument(client, { title: documentId, obj_token: documentId, obj_type: 'docx' }, documents, seenDocIds);
  }

  const chunks = documents.flatMap((document) => chunkDocument(document));
  const payload = {
    syncedAt: new Date().toISOString(),
    source: 'feishu',
    documents,
    chunks
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(KB_PATH, JSON.stringify(payload, null, 2), 'utf8');

  return {
    syncedAt: payload.syncedAt,
    documents: documents.length,
    chunks: chunks.length
  };
}

async function collectWikiTree(client, nodes, documents, seenDocIds, depth) {
  if (depth > config.wikiMaxDepth) {
    return;
  }

  for (const node of nodes) {
    await collectNodeDocument(client, node, documents, seenDocIds);

    if (node.has_child) {
      const children = await client.listWikiNodes(node.space_id, node.node_token);
      await collectWikiTree(client, children, documents, seenDocIds, depth + 1);
    }
  }
}

async function collectNodeDocument(client, node, documents, seenDocIds) {
  if (!node || !node.obj_token) {
    return;
  }

  if (!['docx', 'doc'].includes(node.obj_type)) {
    return;
  }

  await collectDocxDocument(client, node, documents, seenDocIds);
}

async function collectDocxDocument(client, node, documents, seenDocIds) {
  const documentId = node.obj_token;
  if (seenDocIds.has(documentId)) {
    return;
  }

  seenDocIds.add(documentId);
  const content = await client.getDocxRawContent(documentId);

  if (!content.trim()) {
    return;
  }

  documents.push({
    id: documentId,
    title: node.title || documentId,
    nodeToken: node.node_token || '',
    objType: node.obj_type || 'docx',
    content
  });
}

function createFeishuClient() {
  let tokenCache = null;

  const request = async (path, options = {}) => {
    const token = await getTenantAccessToken();
    const response = await fetch(`${FEISHU_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok || payload.code) {
      throw new Error(`Feishu API error ${payload.code || response.status}: ${payload.msg || text}`);
    }

    return payload.data || payload;
  };

  const getTenantAccessToken = async () => {
    const now = Date.now();
    if (tokenCache && tokenCache.expiresAt > now + 60_000) {
      return tokenCache.token;
    }

    const response = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        app_id: config.feishuAppId,
        app_secret: config.feishuAppSecret
      })
    });

    const payload = await response.json();
    if (!response.ok || payload.code) {
      throw new Error(`Feishu auth error ${payload.code || response.status}: ${payload.msg || response.statusText}`);
    }

    tokenCache = {
      token: payload.tenant_access_token,
      expiresAt: now + Number(payload.expire || 7200) * 1000
    };
    return tokenCache.token;
  };

  return {
    getWikiNode: async (nodeToken) => {
      const data = await request(`/wiki/v2/spaces/get_node?token=${encodeURIComponent(nodeToken)}`);
      return data.node;
    },
    listWikiNodes: async (spaceId, parentNodeToken = '') => {
      let pageToken = '';
      const items = [];

      do {
        const params = new URLSearchParams({ page_size: '50' });
        if (pageToken) params.set('page_token', pageToken);
        if (parentNodeToken) params.set('parent_node_token', parentNodeToken);

        const data = await request(`/wiki/v2/spaces/${encodeURIComponent(spaceId)}/nodes?${params}`);
        items.push(...(data.items || []));
        pageToken = data.has_more ? data.page_token : '';
      } while (pageToken);

      return items;
    },
    getDocxRawContent: async (documentId) => {
      const data = await request(`/docx/v1/documents/${encodeURIComponent(documentId)}/raw_content`);
      return data.content || '';
    }
  };
}

async function answerQuestion(question) {
  const kb = await readKnowledgeBase();
  const matches = searchChunks(question, kb.chunks, 4);
  const context = matches.map((match, index) => `#${index + 1} ${match.title}\n${match.text}`).join('\n\n');
  const intent = detectIntent(question);

  if (intent === 'identity') {
    return {
      answer: answerByIntent(intent, question, matches),
      sources: []
    };
  }

  if (!matches.length) {
    const hasKnowledgeBase = kb.chunks.length > 0;
    return {
      answer: hasKnowledgeBase
        ? '本地飞书知识库已经可用，但这次问题没有检索到足够相关的内容。你可以换一个更贴近飞书笔记原文的关键词，或继续补充知识库内容。'
        : '当前本地知识库还没有可用内容。请先配置飞书凭证并执行同步，然后我就可以基于飞书知识库回答访客问题。',
      sources: []
    };
  }

  if (matches[0].score < 6 && !allowsLowConfidenceIntent(intent)) {
    return {
      answer: '这个问题和当前飞书知识库的匹配度比较低，我不想硬把无关内容拼成答案。你可以换成更具体的问题，例如“你的学习目标是什么”“你的 AI 创作方向有哪些”“你记录了哪些实战复盘”。',
      sources: []
    };
  }

  if (config.modelApiUrl && config.modelApiKey) {
    const modelAnswer = await callModel(question, context);
    return {
      answer: modelAnswer,
      sources: matches.slice(0, 3).map(toSource)
    };
  }

  return {
    answer: answerByIntent(intent, question, matches),
    sources: matches.slice(0, 3).map(toSource)
  };
}
async function callModel(question, context) {
  const response = await fetch(config.modelApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.modelApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: 'system',
          content: '你是封辰LAB网站上的公开 AI 问答助手。你只能基于给定的飞书知识库上下文回答；如果上下文不足，要明确说明。不要整段罗列原文，要先总结，再给出关键依据。语气专业、简洁、可信。'
        },
        {
          role: 'user',
          content: `问题：${question}\n\n飞书知识库上下文：\n${context}`
        }
      ],
      temperature: 0.2
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Model API error ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload.choices?.[0]?.message?.content || '模型没有返回有效回答。';
}

function buildLocalSummary(question, matches) {
  const titles = [...new Set(matches.map((match) => match.title).filter(Boolean))].slice(0, 2);
  const points = extractKeyPoints(question, matches, 8);

  if (!points.length) {
    return '我在飞书知识库里找到了相关资料，但目前内容比较分散，暂时无法形成可靠总结。建议补充更明确的标题、目标、结论或复盘段落后再提问。';
  }

  const intro = titles.length
    ? `我从飞书知识库的《${titles.join('》《')}》中检索到相关内容，可以总结为：`
    : '我从飞书知识库中检索到相关内容，可以总结为：';
  const bullets = points.map((point, index) => `${index + 1}. ${point}`).join('\n');
  const conclusion = makeBriefConclusion(question, points);

  return `${intro}\n\n${bullets}\n\n简要判断：${conclusion}`;
}

function answerByIntent(intent, question, matches) {
  if (intent === 'identity') {
    return '我是封辰LAB网站上的 AI 问答助手。我的知识来源主要是封辰在飞书里沉淀的学习笔记、项目资料、方法论和创作复盘。你可以问我关于封辰LAB的学习目标、AI实践方向、项目计划、提示词方法和知识库内容，我会先从本地 RAG 知识库里检索，再整理成回答。';
  }

  const points = extractKeyPoints(question, matches, intent === 'summary' ? 10 : 6);

  if (!points.length) {
    return buildLocalSummary(question, matches);
  }

  switch (intent) {
    case 'capability':
      return [
        '我现在可以帮你做这些事：',
        '',
        '1. 根据飞书知识库回答关于封辰LAB、学习笔记、项目计划和 AI 实践的问题。',
        '2. 把飞书里的零散记录整理成目标、方向、复盘或建议。',
        '3. 对命中的知识片段做归纳，而不是直接把原文整段贴出来。',
        '4. 当知识库没有足够依据时，我会提示你换一个更具体的问题。',
        '',
        `当前知识库里比较明显的线索包括：${points.slice(0, 3).join('；')}。`
      ].join('\n');

    case 'goal':
      return [
        '根据飞书知识库，目前可以看出几个明确目标：',
        '',
        ...points.map((point, index) => `${index + 1}. ${point}`),
        '',
        '我的理解：这些目标不是单纯学习工具，而是在把 AI 信息获取、智能体实践、小程序落地和提示词能力组合成可展示的个人项目。'
      ].join('\n');

    case 'project':
      const projectDirections = uniqueList(points.map(projectizePoint));
      return [
        '从知识库来看，当前更适合沉淀成这几类项目方向：',
        '',
        ...projectDirections.map((point, index) => `${index + 1}. ${point}`),
        '',
        '建议优先级：先做“AI行业信息收集智能体”，因为它和你的学习目标最直接，也最容易变成个人网站上的可展示功能。'
      ].join('\n');

    case 'review':
      return [
        '我把相关学习记录整理成复盘视角：',
        '',
        `已完成/已关注：${points.slice(0, 3).join('；')}。`,
        `可以继续强化：${points.slice(3, 6).join('；') || '把每次学习的成果、截图、链接和结论写得更结构化。'}`,
        '',
        '下一步可以把每次复盘都固定成“目标 - 操作 - 问题 - 解决 - 产出 - 下一步”，这样后续 AI 检索会更准确。'
      ].join('\n');

    case 'advice':
      return [
        '基于当前飞书知识库，我会给你三个建议：',
        '',
        '1. 把“每天搜集AI行业重点信息的智能体”作为主线项目，不要同时铺太多方向。',
        '2. 每条学习笔记都补一个“结论”和“可复用方法”，这样知识库回答会更像经验总结。',
        '3. 把提示词、JSON结构、案例网站和AI博主分析归到同一个专题，后面可以整理成作品或博客。',
        '',
        `依据来自这些记录：${points.slice(0, 4).join('；')}。`
      ].join('\n');

    case 'technical':
      return [
        '这个网站里的知识库问答链路是这样的：',
        '',
        '1. 飞书作为知识源，存放学习笔记、项目资料和方法论。',
        '2. 后端通过飞书开放平台接口同步文档内容。',
        '3. 同步后的内容会被切成多个文本片段，保存到本地知识库。',
        '4. 用户提问时，后端先检索相关片段，再根据问题意图组织回答。',
        '5. 当前还没有接大模型 API，所以它更像“本地检索 + 规则总结”。接入模型后，表达会更自然。',
        '',
        `这次检索到的相关知识点包括：${points.slice(0, 3).join('；')}。`
      ].join('\n');

    case 'summary':
      return [
        '我把这部分飞书内容总结成下面几类：',
        '',
        ...points.map((point, index) => `${index + 1}. ${point}`),
        '',
        '整体来看，这份知识库更像一份 AI 实战学习记录，重点集中在智能体、小程序、提示词工程、信息收集和对 AI 内容生态的观察。'
      ].join('\n');

    default:
      return buildLocalSummary(question, matches);
  }
}

function detectIntent(question) {
  if (isIdentityQuestion(question)) return 'identity';
  if (/你能做什么|你可以做什么|有什么功能|怎么用|能帮我/i.test(question)) return 'capability';
  if (/目标|计划|flag|想做什么|要做什么/i.test(question)) return 'goal';
  if (/项目|作品|方向|创作|案例|产品/i.test(question)) return 'project';
  if (/复盘|学了什么|学习记录|最近学|每日实战/i.test(question)) return 'review';
  if (/建议|怎么学|如何学|下一步|怎么做|路线/i.test(question)) return 'advice';
  if (/rag|知识库|飞书|http|接口|后端|技术|原理|怎么实现/i.test(question)) return 'technical';
  if (/总结|概括|归纳|整理/i.test(question)) return 'summary';
  return 'general';
}

function allowsLowConfidenceIntent(intent) {
  return ['capability', 'goal', 'project', 'review', 'advice', 'technical', 'summary'].includes(intent);
}

function projectizePoint(point, index) {
  if (/智能体|信息/.test(point)) {
    return 'AI行业重点信息收集智能体：每天抓取、筛选并整理重点信息。';
  }

  if (/小程序/.test(point)) {
    return '需求型小程序：围绕一个明确需求做最小可用版本。';
  }

  if (/提示词|json|代码结构/i.test(point)) {
    return '提示词结构化工具：把常用提示词沉淀成 JSON 或类代码模板。';
  }

  if (/焦虑|博主|视频/.test(point)) {
    return 'AI内容观察专题：分析AI博主的焦虑叙事、流量逻辑和知识付费转化。';
  }

  return point || `项目方向 ${index + 1}`;
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function extractKeyPoints(question, matches, limit) {
  const queryTerms = tokenize(question);
  const intent = detectIntent(question);
  const candidates = [];
  const seen = new Set();

  for (const match of matches) {
    for (const piece of splitReadablePieces(match.text)) {
      const normalized = piece.replace(/\s+/g, ' ').trim();
      if (!isUsefulPiece(normalized) || seen.has(normalized)) continue;
      seen.add(normalized);
      candidates.push({
        text: normalized,
        score: scorePiece(queryTerms, normalized, question, intent)
      });
    }
  }

  const isTargetQuestion = /目标|计划|flag/i.test(question);
  const ranked = candidates
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
    .filter((candidate) => !isTargetQuestion || candidate.score >= 8);

  return ranked
    .slice(0, limit)
    .map((candidate) => polishPoint(candidate.text));
}

function splitReadablePieces(text) {
  return text
    .replace(/[✅📸👤📝�]/g, '')
    .split(/[\n。！？；;]+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function isUsefulPiece(piece) {
  if (piece.length < 8 || piece.length > 260) return false;
  if (/^(第[一二三四五六七八九十]+部分|教学卡片\d*|成果展示|你做了哪些工作)$/u.test(piece)) return false;
  if (/第[一二三四五六七八九十]+部分|每日实战复盘|思考与复盘|核心|成果展示/u.test(piece)) return false;
  if (/教学卡片|收获是什么|成果展示|Show Time/i.test(piece)) return false;
  if (/^(任务卡片已阅读|实操已完成|遇到困难已解决)$/u.test(piece)) return false;
  if (/^学习Flag/u.test(piece)) return false;
  if (/^学习目标是$/u.test(piece)) return false;
  if (/^#|Constraints|规则与限制|点击跳转|\]\(https?:\/\//i.test(piece)) return false;
  if (/^[：:、，,\s]+$/.test(piece)) return false;
  return true;
}

function scorePiece(queryTerms, piece, question = '', intent = 'general') {
  const lower = piece.toLowerCase();
  const keywordBoosts = ['目标', '计划', '方法', '理念', '方向', '复盘', 'AI', '智能体', '小程序', '知识库', '提示词'];
  const intentKeywords = {
    goal: ['目标', '计划', '智能体', '小程序', '做一个', '做出'],
    project: ['智能体', '小程序', '提示词', 'json', '案例', '视频', '焦虑'],
    review: ['复盘', '解决', '完成', '了解', '学习', '收获'],
    advice: ['目标', '计划', '智能体', '小程序', '提示词', '方法'],
    technical: ['RAG', '知识库', '飞书', 'HTTP', '接口', '提示词', 'json'],
    summary: ['目标', '复盘', '提示词', '智能体', '小程序', 'AI']
  };
  const queryScore = queryTerms.reduce((score, term) => {
    return lower.includes(term) ? score + Math.min(term.length, 8) : score;
  }, 0);
  const boostScore = keywordBoosts.reduce((score, term) => {
    return piece.includes(term) ? score + 3 : score;
  }, 0);
  const intentKeywordScore = (intentKeywords[intent] || []).reduce((score, term) => {
    return piece.toLowerCase().includes(term.toLowerCase()) ? score + 5 : score;
  }, 0);
  const intentScore = /目标|计划|flag/i.test(question) && (/^做/.test(piece) || /智能体|小程序/.test(piece)) ? 10 : 0;
  const lengthScore = piece.length >= 18 && piece.length <= 90 ? 2 : 0;
  return queryScore + boostScore + intentKeywordScore + intentScore + lengthScore;
}

function polishPoint(point) {
  return point
    .replace(/[�]/g, '')
    .replace(/^[-*•\d.\s]+/, '')
    .replace(/^学习Flag（目标）：?/, '学习目标是')
    .replace(/^学习Flag: ?/, '学习目标是')
    .replace(/^[：:、，,\s]+/, '')
    .trim();
}

function makeBriefConclusion(question, points) {
  const joined = points.join('；');

  if (/目标|计划|flag/i.test(question)) {
    return '重点不是单纯学习工具，而是把 AI 信息整理、智能体和小程序实践结合起来，形成可落地的个人项目。';
  }

  if (/方向|作品|项目|创作/i.test(question)) {
    return '当前资料更偏向 AI 实战学习和项目化尝试，适合继续沉淀成作品案例、自动化工具或个人知识库能力展示。';
  }

  return joined;
}

function isIdentityQuestion(question) {
  return /你是谁|你是什[么麼]|介绍一下你|你的身份|你能做什么|你可以做什么/i.test(question);
}

function chunkDocument(document) {
  const cleanText = document.content.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  const size = 900;
  const overlap = 140;

  for (let start = 0; start < cleanText.length; start += size - overlap) {
    const text = cleanText.slice(start, start + size).trim();
    if (text.length < 40) continue;

    chunks.push({
      id: `${document.id}:${chunks.length + 1}`,
      documentId: document.id,
      title: document.title,
      nodeToken: document.nodeToken,
      text
    });
  }

  return chunks;
}

function searchChunks(question, chunks, limit) {
  const queryTerms = tokenize(question);
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTerms, chunk)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function scoreChunk(queryTerms, chunk) {
  const text = `${chunk.title}\n${chunk.text}`.toLowerCase();
  return queryTerms.reduce((score, term) => {
    const hits = text.split(term).length - 1;
    return score + hits * Math.min(term.length, 8);
  }, 0);
}

function tokenize(input) {
  const normalized = input.toLowerCase();
  const latin = normalized.match(/[a-z0-9_]{2,}/g) || [];
  const chinese = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const grams = chinese.flatMap((word) => {
    const result = [];
    for (let i = 0; i < word.length - 1; i += 1) {
      result.push(word.slice(i, i + 2));
    }
    return result;
  });

  return [...new Set([...latin, ...chinese, ...grams])];
}

function toSource(match) {
  return {
    title: match.title,
    documentId: match.documentId,
    nodeToken: match.nodeToken,
    score: match.score
  };
}

async function readKnowledgeBase() {
  try {
    const content = await readFile(KB_PATH, 'utf8');
    return JSON.parse(content);
  } catch {
    return { syncedAt: null, documents: [], chunks: [] };
  }
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const safePath = normalize(requested).replace(/^[/\\]+/, '').replace(/^(\.\.[/\\])+/, '');
  const filePath = resolve(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    return sendJson(res, 403, { ok: false, error: 'forbidden' });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');

    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    createReadStream(filePath).pipe(res);
  } catch {
    sendJson(res, 404, { ok: false, error: 'not found' });
  }
}

async function loadEnv() {
  try {
    const envText = await readFile(join(ROOT, '.env'), 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional.
  }
}

function listEnv(name) {
  return (process.env[name] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function requireSyncSecret(req) {
  if (!config.syncSecret) {
    return;
  }

  const provided = req.headers['x-sync-secret'];
  if (provided !== config.syncSecret) {
    throw userError('invalid sync secret', 401);
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function userError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function contentType(filePath) {
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };
  return map[extname(filePath).toLowerCase()] || 'application/octet-stream';
}


