(() => {
  const yearNodes = document.querySelectorAll('[data-year]');
  const currentYear = new Date().getFullYear();
  yearNodes.forEach((node) => {
    node.textContent = String(currentYear);
  });

  const languageStorageKey = 'fclab-language';
  const originalTextNodes = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatableAttributes = ['placeholder', 'aria-label', 'alt', 'title', 'data-chat-suggestion'];
  const translations = {
    '首页 - 封辰LAB': 'Home - FCLAB',
    '关于我 - 封辰LAB': 'About - FCLAB',
    '作品集 - 封辰LAB': 'Portfolio - FCLAB',
    'AI 随想录 - 封辰LAB': 'AI Notes - FCLAB',
    '首页': 'Home',
    '关于我': 'About',
    '作品集': 'Portfolio',
    '个人博客': 'Blog',
    '语言切换': 'Language switch',
    '探索 AI 的': 'Explore AI',
    '无限可能': 'Infinite Possibilities',
    '我是封辰，一名与AI做朋友的“驯兽师”': 'I am Fengchen, an AI tamer who works with AI as a creative companion.',
    '查看我的作品': 'View My Work',
    '了解更多': 'Learn More',
    '专属知识库': 'Personal Knowledge Base',
    'AI 问答助手': 'AI Q&A Assistant',
    '我的知识库沉淀在飞书中。AI 助手会把飞书里的项目资料、学习笔记、方法论和案例复盘作为长期知识源，再通过 HTTP 请求、RAG 检索和提示词编排生成回答。': 'My knowledge base lives in Feishu. The AI assistant turns project materials, learning notes, methods, and case reviews into a long-term knowledge source, then answers through HTTP requests, RAG retrieval, and prompt orchestration.',
    '飞书知识源': 'Feishu Knowledge Source',
    '把飞书文档、Wiki、项目复盘和创作笔记整理为 AI 可检索的知识内容。': 'Organize Feishu docs, Wikis, project reviews, and creative notes into AI-retrievable knowledge.',
    'RAG 检索回答': 'RAG Retrieval Answers',
    '先从知识库召回相关资料，再结合问题生成回答，避免脱离个人经验空泛发挥。': 'Retrieve relevant material first, then answer from the question so the response stays grounded in personal experience.',
    '公开访问': 'Public Access',
    '作为个人网站的一部分，访客可以直接提问，快速了解我的作品、能力和方法。': 'As part of the personal site, visitors can ask directly and quickly understand my work, skills, and methods.',
    '飞书知识库 RAG 系统': 'Feishu Knowledge Base RAG System',
    '飞书知识库已预存为 AI 记忆': 'Feishu Knowledge Is Stored as AI Memory',
    '飞书里的资料会经过同步、清洗、切片和向量化，进入 RAG 知识库。访客提问时，系统通过 HTTP 接口接收问题，检索相关知识片段，再把检索结果和提示词一起交给模型生成回答。': 'Materials in Feishu are synced, cleaned, chunked, and vectorized into the RAG knowledge base. When visitors ask questions, the system receives them through an HTTP API, retrieves relevant knowledge snippets, and sends retrieval results plus prompts to the model for answers.',
    '文档 / Wiki / 项目记录': 'Docs / Wiki / Project Records',
    '同步内容并更新索引': 'Sync content and update indexes',
    '召回相关知识片段': 'Retrieve relevant knowledge snippets',
    '约束身份、语气与边界': 'Constrain identity, tone, and boundaries',
    '面向访客生成回答': 'Generate answers for visitors',
    '可以这样问我': 'Try Asking Me',
    '选择一个问题开始，或直接输入你想了解的内容。': 'Choose a question to start, or type what you want to know.',
    '推荐问题': 'Suggested questions',
    'FCLAB目前有哪些作品方向？': 'What creative directions does FCLAB currently focus on?',
    '你是如何学习和使用 AI 的？': 'How do you learn and use AI?',
    '这个知识库问答系统是怎么实现的？': 'How is this knowledge-base Q&A system built?',
    '你现在最关注哪些创作能力？': 'Which creative abilities are you focusing on now?',
    '问问封辰LAB：作品方向、AI 方法论、项目经验...': 'Ask FCLAB: work direction, AI methods, project experience...',
    '发送': 'Send',
    'FCLAB. 保留所有权利。': 'FCLAB. All rights reserved.',
    '关于我的星球导航': 'Planet navigation about me',
    '点击一颗星球，认识我的一个侧面。': 'Click a planet to discover one side of me.',
    '定位': 'Position',
    '介绍': 'Intro',
    '网站': 'Site',
    '关注': 'Focus',
    '方式': 'Method',
    '现在': 'Now',
    '关闭介绍': 'Close introduction',
    '关闭': 'Close',
    '一句话定位': 'One-Line Positioning',
    '我是封辰，一个持续探索 AI、内容表达与数字创作的人。': 'I am Fengchen, someone who keeps exploring AI, content expression, and digital creation.',
    '我如何理解表达': 'How I Understand Expression',
    '我喜欢研究一件事如何被更清晰地表达，也喜欢把零散的想法整理成更完整的作品。': 'I like studying how an idea can be expressed more clearly, and I like turning scattered thoughts into more complete works.',
    '这几年，我越来越关注 AI、视频表达、网页呈现和个人品牌之间的关系，也在不断学习如何把这些能力真正连接起来。': 'In recent years, I have paid more attention to the relationship between AI, video expression, web presentation, and personal branding, while learning how to connect these abilities in practice.',
    '这个网站是什么': 'What This Site Is',
    '这个网站对我来说，不只是一个展示页。': 'To me, this website is more than a showcase page.',
    '它更像是我的个人存档、学习记录，也是我持续输出和长期成长的一个空间。': 'It is more like a personal archive, a learning record, and a space for continued output and long-term growth.',
    '我在关注什么': 'What I Care About',
    'AI 在创作中的真实应用': 'Real AI Applications in Creation',
    '更有结构感的内容表达': 'More Structured Content Expression',
    '视频与视觉呈现': 'Video and Visual Presentation',
    '网页作为个人表达载体的可能性': 'The Web as a Medium for Personal Expression',
    '我的做事方式': 'How I Work',
    '我习惯先把问题想清楚，再把内容整理清楚，最后把呈现打磨清楚。': 'I usually clarify the problem first, organize the content second, and polish the presentation last.',
    '比起做很多杂乱的东西，我更希望每一次输出都能更接近“完整、清晰、有质感”。': 'Rather than making many scattered things, I want each output to move closer to being complete, clear, and refined.',
    '现在的我': 'Where I Am Now',
    '我正在持续提升自己的创作能力，也在学习如何把内容、工具和技术更自然地结合起来。': 'I am continuously improving my creative abilities and learning how to connect content, tools, and technology more naturally.',
    '我希望以后做出来的作品，不只是能看，而是真的能代表我。': 'I hope my future work will not only be viewable, but genuinely represent me.',
    '这里会慢慢更新我的项目、思考和阶段性成果。欢迎你通过这个网站认识我，也欢迎和我交流。': 'This place will gradually update with my projects, thoughts, and stage-by-stage results. You are welcome to get to know me through this site and to connect with me.',
    '创作展示': 'Creative Showcase',
    '探索生成式 AI 的可能性，从分镜叙事、视频生成到视觉参考研究，这里记录可复用的方法与作品': 'Exploring the possibilities of generative AI, from storyboard narratives and video generation to visual reference studies. This space records reusable methods and works.',
    '作品筛选': 'Portfolio filter',
    '全部作品': 'All Works',
    '学习路径': 'Learning Path',
    '点击查看完整视频': 'View Full Video',
    '点击查看大图': 'View Large Image',
    'iqoo 13电商产品短片': 'iQOO 13 E-Commerce Product Short',
    '多分镜产品展示。': 'A multi-shot product showcase.',
    'AI生图前后对比图': 'AI Image Before-and-After Comparison',
    '海上风电与云层光影参考': 'Offshore wind and cloud lighting reference',
    '记录云层、海面、日落与风机剪影的色彩对照。': 'A color comparison of clouds, sea surface, sunset, and turbine silhouettes.',
    '工地巡检：有关产品的分镜图': 'Construction Site Inspection: Product Storyboard',
    '工地巡检 AI 分镜图': 'Construction inspection AI storyboard',
    '用六格分镜拆解短片节奏、人物动作和安全巡检情绪。': 'A six-panel storyboard that breaks down pacing, actions, and the mood of safety inspection.',
    '我的学习路径': 'My Learning Path',
    '这不是一堆零散任务，而是我从基础接入、理解 AI、使用 AI，到借助 AI 做出真实项目的完整过程。': 'This is not a pile of scattered tasks, but the full path from basic access, understanding AI, and using AI to building real projects with AI.',
    '先进入这个世界': 'First Enter This World',
    '完成基础数字环境接入，注册并熟悉常用平台账号，理解国外网站的用途，建立稳定的信息获取入口。': 'Set up the basic digital environment, register and learn common platform accounts, understand how overseas sites are used, and build stable access to information.',
    '账号与平台认知': 'Accounts and platform awareness',
    '英文界面适应': 'English interface adaptation',
    '基础网络能力': 'Basic network capability',
    '学会和 AI 高效协作': 'Learn to Collaborate Efficiently with AI',
    '系统认识主流 AI 工具，学习提示词工程，并用 Markdown、JSON 和笔记工具训练结构化表达能力。': 'Learn mainstream AI tools systematically, study prompt engineering, and train structured expression with Markdown, JSON, and note tools.',
    'AI 工具认知': 'AI tool awareness',
    '提示词工程': 'Prompt engineering',
    '结构化表达': 'Structured expression',
    '从会用工具，到理解原理': 'From Using Tools to Understanding Principles',
    '进入生图、生视频、生音频与多模态实战，理解 HTTP 请求、API 调用和云端模型如何把需求变成结果。': 'Practice image, video, audio, and multimodal generation while understanding how HTTP requests, API calls, and cloud models turn needs into results.',
    '多模态生成': 'Multimodal generation',
    'HTTP / API': 'HTTP / API',
    'ComfyUI 工作流': 'ComfyUI workflow',
    '把学习结果真正做出来': 'Turn Learning into Real Output',
    '学习 GitHub、VS Code 和本地 AI 助手，把个人信息、学习过程、作品展示与 AI 问答系统落到一个可访问的网站中。': 'Learn GitHub, VS Code, and local AI assistants, then turn personal information, learning process, portfolio, and AI Q&A into an accessible website.',
    '网站开发': 'Website development',
    'GitHub 管理': 'GitHub management',
    'AI 问答与知识库': 'AI Q&A and knowledge base',
    '这条路径让我完成了一次从“会用工具”到“能做作品”的能力升级：把想法落地，把学习变成作品，把工具变成能力。': 'This path helped me move from using tools to making works: turning ideas into reality, learning into output, and tools into ability.',
    '作品预览': 'Work Preview',
    '关闭预览': 'Close preview',
    '关于 AI，此刻在想什么？': 'What are you thinking about AI right now?',
    '发布': 'Post',
    '封辰 · 2小时前': 'Fengchen · 2 hours ago',
    '刚尝试了最新多模态模型。它对视觉隐含情绪的捕捉已接近“共情”构图。AGI 也许不需要灵魂，它需要足够好的镜像神经元模拟。': 'I just tried the latest multimodal model. Its grasp of implicit visual emotion is approaching empathetic composition. AGI may not need a soul; it may need a good enough simulation of mirror neurons.',
    'AI 图像 1': 'AI image 1',
    'AI 图像 2': 'AI image 2',
    '封辰 · 昨天 22:15': 'Fengchen · Yesterday 22:15',
    '提示词工程正在从黑盒咒语演变为逻辑架构。未来开发者的核心能力，可能是定义问题边界而非堆砌实现细节。': 'Prompt engineering is evolving from black-box incantation into logical architecture. The core ability of future developers may be defining problem boundaries rather than piling up implementation details.',
    '封辰 · 3月14日': 'Fengchen · Mar 14',
    'AI 时代，审美是最后一道护城河。当生成内容溢出，人类的选择力与策展力比创作力更珍贵。': 'In the AI era, aesthetics may be the last moat. When generated content overflows, human selection and curation become more valuable than raw creation.',
    'AI 热议榜': 'AI Hot Topics',
    '# 大模型多模态演进 · 1.2k': '# Multimodal LLM Evolution · 1.2k',
    '# 生产力革命 · 856': '# Productivity Revolution · 856',
    '# 提示词工程进阶 · 642': '# Advanced Prompt Engineering · 642',
    '# AGI 审美重构 · 421': '# AGI Aesthetic Reconstruction · 421',
    '思考分类': 'Thought Categories',
    '#技术随笔': '#Tech Notes',
    '#伦理考量': '#Ethics',
    '#交互设计': '#Interaction Design',
    '#数字策展': '#Digital Curation',
    '加紧开发中...': 'Under active development...'
  };

  const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();
  const getStoredLanguage = () => {
    try {
      return localStorage.getItem(languageStorageKey) === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  };
  const setStoredLanguage = (language) => {
    try {
      localStorage.setItem(languageStorageKey, language);
    } catch {}
  };
  const translateValue = (value, language) => {
    if (language === 'zh') return value;
    const key = normalizeText(value);
    return translations[key] || value;
  };
  const collectTextNodes = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || !normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('script, style, [data-no-i18n], .material-symbols-outlined')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  };
  const applyLanguage = (language) => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title = language === 'zh' ? (translations.__originalTitle || document.title) : translateValue(translations.__originalTitle || document.title, language);

    collectTextNodes().forEach((node) => {
      if (!originalTextNodes.has(node)) {
        originalTextNodes.set(node, node.nodeValue);
      }
      const original = originalTextNodes.get(node);
      node.nodeValue = language === 'zh' ? original : node.nodeValue.replace(normalizeText(node.nodeValue), translateValue(original, language).trim());
    });

    document.querySelectorAll('*').forEach((element) => {
      translatableAttributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        if (!originalAttributes.has(element)) originalAttributes.set(element, {});
        const store = originalAttributes.get(element);
        if (!store[attribute]) store[attribute] = element.getAttribute(attribute);
        element.setAttribute(attribute, language === 'zh' ? store[attribute] : translateValue(store[attribute], language));
      });
    });

    document.querySelectorAll('[data-lang-option]').forEach((button) => {
      const isActive = button.dataset.langOption === language;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  translations.__originalTitle = document.title;
  document.querySelectorAll('[data-lang-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const language = button.dataset.langOption === 'en' ? 'en' : 'zh';
      setStoredLanguage(language);
      applyLanguage(language);
    });
  });
  applyLanguage(getStoredLanguage());

  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxTitle = document.querySelector('[data-lightbox-title]');
  const lightboxContent = document.querySelector('[data-lightbox-content]');
  const lightboxClose = document.querySelector('[data-lightbox-close]');
  const lightboxTriggers = document.querySelectorAll('[data-lightbox-src]');
  const hoverPreviewVideos = document.querySelectorAll('[data-hover-preview-video]');

  const getPreviewStart = (video) => Number.parseFloat(video.dataset.previewStart || '0') || 0;
  const getPreviewEnd = (video) => Number.parseFloat(video.dataset.previewEnd || '0') || 0;
  const getThumbnailTime = (video, fallback) => Number.parseFloat(video.dataset.thumbnailTime || String(fallback)) || fallback;

  const seekVideo = (video, time) => {
    const jump = () => {
      if (Number.isFinite(video.duration) && video.duration > time) {
        video.currentTime = time;
      }
    };

    if (video.readyState >= 1) {
      jump();
    } else {
      video.addEventListener('loadedmetadata', jump, { once: true });
    }
  };

  const prepareHoverPreview = (video) => {
    const start = getPreviewStart(video);
    const end = getPreviewEnd(video);
    const thumbnailTime = getThumbnailTime(video, start);

    video.muted = true;
    video.playsInline = true;
    seekVideo(video, thumbnailTime);

    const playPreview = () => {
      seekVideo(video, start);
      video.play?.().catch(() => {});
    };

    const resetPreview = () => {
      video.pause();
      seekVideo(video, thumbnailTime);
    };

    video.addEventListener('timeupdate', () => {
      if (end > start && video.currentTime >= end) {
        seekVideo(video, start);
      }
    });

    const trigger = video.closest('[data-lightbox-src]');
    trigger?.addEventListener('pointerenter', playPreview);
    trigger?.addEventListener('pointerleave', resetPreview);
    trigger?.addEventListener('focus', playPreview);
    trigger?.addEventListener('blur', resetPreview);
  };

  const closeLightbox = () => {
    if (!lightbox || !lightboxContent) return;
    lightbox.hidden = true;
    lightboxContent.replaceChildren();
    document.body.style.overflow = '';
  };

  lightboxTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      if (!lightbox || !lightboxTitle || !lightboxContent) return;

      const src = trigger.dataset.lightboxSrc;
      const type = trigger.dataset.lightboxType;
      const title = trigger.dataset.lightboxTitle || '作品预览';
      const poster = trigger.dataset.lightboxPoster;

      lightboxTitle.textContent = title;
      lightboxContent.replaceChildren();

      if (type === 'video') {
        const video = document.createElement('video');
        video.src = src;
        if (poster) {
          video.poster = poster;
        }
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        lightboxContent.appendChild(video);
      } else {
        const image = document.createElement('img');
        image.src = src;
        image.alt = title;
        image.loading = 'eager';
        image.decoding = 'async';
        lightboxContent.appendChild(image);
      }

      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      trigger.blur();
    });
  });

  hoverPreviewVideos.forEach(prepareHoverPreview);

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });

  const aboutPlanets = document.querySelectorAll('[data-about-target]');
  const aboutPanels = document.querySelectorAll('[data-about-panel]');
  const aboutPopover = document.querySelector('[data-about-popover]');
  const aboutClose = document.querySelector('[data-about-close]');

  const activateAboutPanel = (target) => {
    aboutPlanets.forEach((planet) => {
      const isActive = planet.dataset.aboutTarget === target;
      planet.classList.toggle('is-active', isActive);
      planet.setAttribute('aria-pressed', String(isActive));
    });

    aboutPanels.forEach((panel) => {
      const isActive = panel.dataset.aboutPanel === target;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });

    if (aboutPopover) {
      aboutPopover.hidden = false;
    }
  };

  const closeAboutPanel = () => {
    if (aboutPopover) {
      aboutPopover.hidden = true;
    }

    aboutPlanets.forEach((planet) => {
      planet.classList.remove('is-active');
      planet.setAttribute('aria-pressed', 'false');
    });
  };

  aboutPlanets.forEach((planet) => {
    planet.addEventListener('click', () => {
      activateAboutPanel(planet.dataset.aboutTarget);
    });
  });

  aboutClose?.addEventListener('click', closeAboutPanel);

  document.addEventListener('click', (event) => {
    if (!aboutPopover || aboutPopover.hidden) return;
    const clickedPlanet = event.target.closest?.('[data-about-target]');
    const clickedPopover = event.target.closest?.('[data-about-popover]');
    if (!clickedPlanet && !clickedPopover) {
      closeAboutPanel();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAboutPanel();
    }
  });

  const chatForm = document.querySelector('[data-chat-form]');
  const chatInput = document.querySelector('[data-chat-input]');
  const chatLog = document.querySelector('[data-chat-log]');
  const chatEmpty = document.querySelector('[data-chat-empty]');
  const chatSuggestions = document.querySelectorAll('[data-chat-suggestion]');

  if (!chatForm || !chatInput || !chatLog) {
    return;
  }

  const answerFromKnowledgeBase = (question) => {
    const normalized = question.toLowerCase();
    const language = getStoredLanguage();

    if (question.includes('作品') || question.includes('项目') || normalized.includes('portfolio')) {
      if (language === 'en') {
        return 'I will first retrieve portfolio cases, project reviews, and visual experiment notes from the Feishu knowledge base, then answer within the prompt constraints.';
      }
      return '我会先从飞书知识库中检索作品案例、项目复盘和视觉实验记录，再结合提示词约束回答。';
    }

    if (question.includes('技术') || question.includes('RAG') || question.includes('rag') || question.includes('知识库') || question.includes('飞书')) {
      if (language === 'en') {
        return 'The Q&A assistant works like this: the webpage submits the question through an HTTP request, the backend performs RAG retrieval from the synced Feishu knowledge base, and the relevant snippets are combined with the user question and system prompt before being sent to the model.';
      }
      return '这个问答助手的设计链路是：网页通过 HTTP 请求提交问题，后端从飞书同步后的知识库中做 RAG 检索，再把相关片段、用户问题和系统提示词组合后交给模型生成回答。';
    }

    if (question.includes('理念') || question.includes('设计')) {
      if (language === 'en') {
        return 'Based on the methods recorded in Feishu, my core idea is digital curation: organizing technology, narrative, aesthetics, and interaction into digital works that are understandable, experiential, and able to evolve.';
      }
      return '根据飞书中沉淀的方法论，我的核心理念是数字策展：把技术、叙事、审美和交互组织成可理解、可体验、可持续演进的数字作品。';
    }

    if (language === 'en') {
      return 'I will retrieve from the project materials, learning notes, and methods stored in Feishu, then use prompts to keep the answer within scope. This frontend demo shows the public Q&A experience; the full version relies on backend RAG retrieval.';
    }
    return '我会基于飞书中预存的项目资料、学习笔记和方法论进行检索，再通过提示词控制回答范围。这个前端演示展示的是公开问答体验，正式接入后会由后端完成真实 RAG 检索。';
  };

  const createMessage = (content, type) => {
    if (type === 'user') {
      const message = document.createElement('div');
      message.className = 'chat-message chat-user';
      const paragraph = document.createElement('p');
      paragraph.textContent = content;
      message.appendChild(paragraph);
      return message;
    }

    const row = document.createElement('div');
    row.className = 'chat-row';

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'bolt';
    avatar.appendChild(icon);

    const message = document.createElement('div');
    message.className = 'chat-message chat-ai';
    const paragraph = document.createElement('p');
    paragraph.textContent = content;

    message.appendChild(paragraph);
    row.append(avatar, message);
    return row;
  };

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = chatInput.value.trim();

    if (!question) {
      return;
    }

    if (chatEmpty) {
      chatEmpty.hidden = true;
    }

    chatLog.appendChild(createMessage(question, 'user'));
    chatInput.value = '';

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'request failed');
      }

      chatLog.appendChild(createMessage(payload.answer, 'ai'));
      chatLog.scrollTop = chatLog.scrollHeight;
    } catch {
      window.setTimeout(() => {
        chatLog.appendChild(createMessage(answerFromKnowledgeBase(question), 'ai'));
        chatLog.scrollTop = chatLog.scrollHeight;
      }, 320);
    }
  });

  chatSuggestions.forEach((suggestion) => {
    suggestion.addEventListener('click', () => {
      chatInput.value = suggestion.dataset.chatSuggestion || suggestion.textContent.trim();
      chatInput.focus();
    });
  });
})();
