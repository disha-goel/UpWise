export interface ArticleContext {
  title?: string;
  publisher?: string;
  url?: string;
  summary?: string;
  content?: string;
  category?: string;
  publishedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  articleContext?: ArticleContext;
  language?: 'en' | 'hi';
  history?: ChatMessage[];
}

export async function generateAiReply(req: ChatRequest): Promise<{
  reply: string;
  isAiLive: boolean;
  model: string;
}> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const isHindi = req.language === 'hi' || /[\u0900-\u097F]/.test(req.message);

  // 1. If GEMINI_API_KEY is configured, call official Gemini API
  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: `You are the UPWISE Editorial & Learning Assistant, a calm, fact-grounded companion for students, researchers, and professionals.
Style & Integrity Rules:
- Distinguish verified source facts from AI-generated explanations or interpretations.
- Ground your answers in the provided article context. Never invent facts, timestamps, or quotes.
- Include citations and references to the publisher when provided.
- Language: Respond in ${isHindi ? 'fluent Hindi (Devanagari script)' : 'clear, concise editorial English'}.
- Structure response with clear markdown headings, bullet points, and an explicit "Source Facts" section followed by an "Educational & Career Analysis" section.`,
                },
              ],
            },
            contents: [
              ...(req.history || []).map((h) => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }],
              })),
              {
                role: 'user',
                parts: [
                  {
                    text: `${
                      req.articleContext
                        ? `[ARTICLE CONTEXT]\nHeadline: ${req.articleContext.title || ''}\nPublisher: ${
                            req.articleContext.publisher || ''
                          }\nCategory: ${req.articleContext.category || ''}\nSummary: ${
                            req.articleContext.summary || ''
                          }\nFull text: ${req.articleContext.content || ''}\nOriginal URL: ${
                            req.articleContext.url || ''
                          }\n\n`
                        : ''
                    }User Question: ${req.message}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { reply: text, isAiLive: true, model: 'Gemini 1.5 Flash' };
        }
      }
    } catch (e) {
      console.warn('[AI Service] Gemini API call error:', (e as Error).message);
    }
  }

  // 2. Contextual Editorial Analysis (Transparent Fallback when GEMINI_API_KEY is not set)
  const lowerMsg = req.message.toLowerCase();
  const ctx = req.articleContext;

  let replyText = '';

  if (isHindi) {
    if (ctx) {
      if (lowerMsg.includes('सरल') || lowerMsg.includes('explain') || lowerMsg.includes('simply')) {
        replyText = `### सरल शब्दों में समझें:\n\n` +
          `• **क्या हुआ:** ${ctx.title}\n` +
          `• **सरल विवरण:** ${ctx.summary || 'इस समाचार में महत्वपूर्ण प्रगति की जानकारी दी गई है।'}\n` +
          `• **मूल प्रकाशक:** [${ctx.publisher || 'सत्यापित स्रोत'}](${ctx.url || '#'})\n\n` +
          `> **सत्यापित तथ्य:** यह जानकारी मूल रूप से ${ctx.publisher || 'प्रकाशक'} द्वारा रिपोर्ट की गई है।`;
      } else if (lowerMsg.includes('सार') || lowerMsg.includes('key point') || lowerMsg.includes('summar')) {
        replyText = `### मुख्य बिंदु (Key Points):\n\n` +
          `1. **केंद्रीय विषय:** ${ctx.title}\n` +
          `2. **संक्षिप्त पृष्ठभूमि:** ${ctx.summary || 'संपादकीय विवरण उपलब्ध है।'}\n` +
          `3. **श्रेणी:** ${ctx.category || 'समाचार'}\n\n` +
          `*स्रोत: [${ctx.publisher || 'प्रकाशक वेबसाइट'}](${ctx.url || '#'})*`;
      } else if (lowerMsg.includes('छात्र') || lowerMsg.includes('student') || lowerMsg.includes('प्रभाव') || lowerMsg.includes('matter')) {
        replyText = `### यह क्यों महत्वपूर्ण है और छात्रों पर प्रभाव:\n\n` +
          `• **समसामयिक समझ (Current Affairs):** सिविल सेवा, कॉलेज और प्रतियोगी परीक्षाओं में ${ctx.category || 'इस विषय'} पर प्रश्न पूछे जा सकते हैं।\n` +
          `• **सामाजिक प्रासंगिकता:** यह घटना नागरिक जीवन, नीति निर्माण और संस्थागत प्रक्रियाओं को सीधे प्रभावित करती है।\n` +
          `• **गहन अध्ययन:** संपूर्ण संदर्भ के लिए [${ctx.publisher}](${ctx.url || '#'}) का मूल लेख पढ़ें।`;
      } else if (lowerMsg.includes('कौशल') || lowerMsg.includes('करियर') || lowerMsg.includes('career') || lowerMsg.includes('skill')) {
        replyText = `### प्रासंगिक कौशल एवं करियर अवसर:\n\n` +
          `• **मांग में कौशल:** नीति विश्लेषण (Policy Analysis), डेटा संकलन, और शोध क्षमता।\n` +
          `• **करियर क्षेत्र:** ${ctx.category || 'संबंधित उद्योग'} में विनियामक सलाहकार, पत्रकारिता और तकनीकी गवर्नेंस की भूमिकाएं।\n` +
          `• **सत्यापित रिपोर्ट:** [${ctx.publisher}](${ctx.url || '#'})`;
      } else if (lowerMsg.includes('कठिन') || lowerMsg.includes('शब्द') || lowerMsg.includes('term')) {
        replyText = `### कठिन शब्दावली एवं अवधारणाएं:\n\n` +
          `• **${ctx.category || 'संपादकीय पद'}:** इस संदर्भ में प्रयुक्त तकनीकी व प्रशासनिक शब्दावली को समझने से विषय की स्पष्टता बढ़ती है।\n` +
          `• **तथ्य सत्यापन:** हमेशा मूल प्रकाशन [${ctx.publisher}](${ctx.url || '#'}) पर संदर्भ की पुष्टि करें।`;
      } else {
        replyText = `### "${ctx.title}" पर संपादकीय विश्लेषण:\n\n` +
          `आपके प्रश्न *" ${req.message} "* के संदर्भ में:\n\n` +
          `• **प्रकाशक रिपोर्ट:** ${ctx.publisher || 'स्रोत'} के अनुसार: ${ctx.summary || 'विवरण लेख में उपलब्ध है।'}\n` +
          `• **स्रोत लिंक:** [${ctx.publisher} पर पढ़ें](${ctx.url || '#'})`;
      }
    } else {
      replyText = `### UPWISE संपादकीय एवं शिक्षण सहायक\n\n` +
        `नमस्ते! किसी भी समाचार का सरल सार, छात्रों पर प्रभाव या करियर से जुड़े पहलू जानने के लिए फ़ीड से कोई लेख चुनें।\n\n` +
        `*सुझाव: लेख खोलने पर सहायक तुरंत उस कहानी के संदर्भ में उत्तर देगा।*`;
    }
  } else {
    // English responses
    if (ctx) {
      if (lowerMsg.includes('simply') || lowerMsg.includes('explain')) {
        replyText = `### Plain English Explanation\n\n` +
          `• **The Core Story:** ${ctx.title}\n` +
          `• **In Plain Terms:** ${ctx.summary || 'The reporting covers a significant operational or policy milestone.'}\n` +
          `• **Original Outlet:** Reported by [${ctx.publisher}](${ctx.url || '#'})\n\n` +
          `> **Verified Fact:** Factual attribution belongs to the reporting bureau at ${ctx.publisher}.`;
      } else if (lowerMsg.includes('summar') || lowerMsg.includes('key point')) {
        replyText = `### Key Points Breakdown\n\n` +
          `1. **Lead Headline:** ${ctx.title}\n` +
          `2. **Core Context:** ${ctx.summary || 'Reporting filed under ' + (ctx.category || 'General News') + '.'}\n` +
          `3. **Publisher Verification:** Credentialed coverage published by [${ctx.publisher}](${ctx.url || '#'})\n\n` +
          `*Cross-reference other publishers via UPWISE Multi-Source view.*`;
      } else if (lowerMsg.includes('student') || lowerMsg.includes('matter') || lowerMsg.includes('impact')) {
        replyText = `### Why This Matters & Student Impact\n\n` +
          `• **Academic Relevance:** Provides a timely case study in ${ctx.category || 'public affairs'} suitable for competitive examinations and essays.\n` +
          `• **Societal Context:** Reflects real-world regulatory, economic, or social shifts affecting communities.\n` +
          `• **Source Attribution:** Reported by [${ctx.publisher}](${ctx.url || '#'})`;
      } else if (lowerMsg.includes('skill') || lowerMsg.includes('career') || lowerMsg.includes('opportunity')) {
        replyText = `### Relevant Skills & Career Opportunities\n\n` +
          `• **In-Demand Skills:** Systems analysis, regulatory compliance, policy research, and data verification.\n` +
          `• **Emerging Roles:** Opportunities in public administration, investigative reporting, and industry research related to ${ctx.category}.\n` +
          `• **Full Article:** [Read complete piece at ${ctx.publisher}](${ctx.url || '#'})`;
      } else if (lowerMsg.includes('term') || lowerMsg.includes('concept') || lowerMsg.includes('difficult')) {
        replyText = `### Terminology & Core Concepts\n\n` +
          `• **Sector:** ${ctx.category || 'Public Affairs'}\n` +
          `• **Key Focus:** Understanding institutional decision-making and verifying primary source data.\n` +
          `• **Citation:** [${ctx.publisher} Original Story](${ctx.url || '#'})`;
      } else {
        replyText = `### Editorial Analysis: "${ctx.title}"\n\n` +
          `Regarding your question: *"${req.message}"*\n\n` +
          `• **Source Facts:** According to reporting by ${ctx.publisher}, ${ctx.summary || 'this event is being tracked closely by domain correspondents.'}\n` +
          `• **Source Link:** [Read on ${ctx.publisher}](${ctx.url || '#'})`;
      }
    } else {
      replyText = `### UPWISE Editorial Assistant\n\n` +
        `Hello! I am your contextual reading and learning assistant.\n` +
        `• **Select any article** in the feed to ask for instant summaries, student impact, or career implications.\n` +
        `• All answers distinguish source facts from analytical synthesis.\n\n` +
        `*Click any news story from the feed to begin contextual reading.*`;
    }
  }

  // Prepend transparent notice about engine mode
  const modeNotice = `\n\n---\n*ℹ️ Note: Live generative AI API is unconfigured (\`GEMINI_API_KEY\` not set in \`.env\`). Displaying contextual facts and analysis directly parsed from the article's accredited source.*`;

  return {
    reply: replyText + modeNotice,
    isAiLive: false,
    model: 'UPWISE Editorial Engine (Contextual Fallback)',
  };
}

// ----------------------------------------------------------------------
// Evidence Lens: Dedicated Web-Search Claim Evidence Workflow
// ----------------------------------------------------------------------

export interface EvidenceSource {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
}

export interface EvidenceItem {
  sourceTitle: string;
  sourceUrl: string;
  quote: string;
  date?: string;
  relevance?: 'supporting' | 'contradicting' | 'inconclusive';
}

export interface EvidenceLensRequest {
  claim: string;
  articleContext?: ArticleContext;
  language?: 'en' | 'hi';
}

export interface EvidenceLensResponse {
  success: boolean;
  claim: string;
  searchAvailable: boolean;
  searchProvider?: string;
  verdict: 'supported' | 'contradicted' | 'inconclusive' | 'unverified';
  summary: string;
  evidence: {
    supporting: EvidenceItem[];
    contradicting: EvidenceItem[];
    inconclusive: EvidenceItem[];
  };
  sources: Array<{ title: string; url: string; date?: string }>;
  aiInterpretation: string;
  retrievedAt: string;
}

async function fetchTavilySearch(query: string): Promise<EvidenceSource[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: false,
        max_results: 5,
      }),
    });

    if (!res.ok) {
      console.warn('[Tavily Search API Error]', res.status);
      return [];
    }

    const data = await res.json();
    if (Array.isArray(data.results)) {
      return data.results.map((r: any) => ({
        title: r.title || 'Accredited Source',
        url: r.url || '#',
        snippet: r.content || '',
        publishedDate: r.published_date || undefined,
        score: r.score,
      }));
    }
  } catch (err) {
    console.warn('[Tavily Search Fetch Failed]', (err as Error).message);
  }
  return [];
}

export async function verifyClaimEvidence(
  req: EvidenceLensRequest
): Promise<EvidenceLensResponse> {
  const claim = req.claim.trim();
  const retrievedAt = new Date().toISOString();

  // 1. Attempt real search retrieval via Tavily API
  const rawSources = await fetchTavilySearch(claim);
  const searchAvailable = rawSources.length > 0;

  // 2. If no search API key is configured or search returned 0 results
  if (!searchAvailable) {
    // If article context exists, evaluate strictly against the article without fabricating external web search
    if (req.articleContext && (req.articleContext.content || req.articleContext.summary)) {
      const quoteExcerpt = (req.articleContext.summary || req.articleContext.content || '').slice(0, 260);

      const item: EvidenceItem = {
        sourceTitle: req.articleContext.publisher || 'Accredited Wire Source',
        sourceUrl: req.articleContext.url || '#',
        quote: quoteExcerpt ? `"...${quoteExcerpt}..."` : 'Reporting covers this development directly.',
        date: req.articleContext.publishedAt ? new Date(req.articleContext.publishedAt).toLocaleDateString() : 'Recent',
        relevance: 'inconclusive',
      };

      return {
        success: true,
        claim,
        searchAvailable: false,
        searchProvider: 'Article Primary Source (Web Search Unconfigured)',
        verdict: 'inconclusive',
        summary: 'Claim could not be fully substantiated by the provided article context. Live external search is unavailable.',
        evidence: {
          supporting: [],
          contradicting: [],
          inconclusive: [item],
        },
        sources: [
          {
            title: req.articleContext.publisher || 'Primary Article Source',
            url: req.articleContext.url || '#',
            date: item.date,
          },
        ],
        aiInterpretation: `Evaluated exclusively against the primary article text from ${req.articleContext.publisher || 'the publisher'}. External web search requires TAVILY_API_KEY in server/.env. No external citations were fabricated.`,
        retrievedAt,
      };
    }

    // Completely unavailable state when neither Tavily nor article context is available
    return {
      success: true,
      claim,
      searchAvailable: false,
      searchProvider: 'None (TAVILY_API_KEY not configured)',
      verdict: 'unverified',
      summary: 'Live web evidence retrieval is unavailable because TAVILY_API_KEY is not configured on the backend server. To inspect live web evidence, please add TAVILY_API_KEY to server/.env.',
      evidence: {
        supporting: [],
        contradicting: [],
        inconclusive: [],
      },
      sources: [],
      aiInterpretation: 'Transparent Status: No external evidence could be retrieved without a configured search provider. Upwise never fabricates source citations or artificial confirmation.',
      retrievedAt,
    };
  }

  // 3. When real search sources ARE retrieved, classify them
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      const prompt = `You are the UPWISE Evidence Lens verification engine.
Claim to evaluate: "${claim}"

Below are verified web search results retrieved from accredited sources:
${rawSources
  .map(
    (s, idx) => `[Source ${idx + 1}] Title: ${s.title}\nURL: ${s.url}\nExcerpt: ${s.snippet}\nDate: ${s.publishedDate || 'N/A'}`
  )
  .join('\n\n')}

Instructions:
1. Ground your analysis STRICTLY in the provided search excerpts. Never invent facts or URLs.
2. Separate into "supporting", "contradicting", and "inconclusive".
3. Formulate an overall verdict: "supported", "contradicted", or "inconclusive".
4. Provide a 2-3 sentence AI interpretation explaining the rationale.

Respond ONLY with valid JSON in this exact structure:
{
  "verdict": "supported" | "contradicted" | "inconclusive",
  "summary": "Brief 1-2 sentence verdict summary",
  "supportingIndices": [1, ...],
  "contradictingIndices": [...],
  "inconclusiveIndices": [...],
  "aiInterpretation": "Clear analytical synthesis"
}`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: 'application/json' },
          }),
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);

          const supporting: EvidenceItem[] = (parsed.supportingIndices || [])
            .map((idx: number) => rawSources[idx - 1])
            .filter(Boolean)
            .map((s: EvidenceSource) => ({
              sourceTitle: s.title,
              sourceUrl: s.url,
              quote: s.snippet,
              date: s.publishedDate,
              relevance: 'supporting',
            }));

          const contradicting: EvidenceItem[] = (parsed.contradictingIndices || [])
            .map((idx: number) => rawSources[idx - 1])
            .filter(Boolean)
            .map((s: EvidenceSource) => ({
              sourceTitle: s.title,
              sourceUrl: s.url,
              quote: s.snippet,
              date: s.publishedDate,
              relevance: 'contradicting',
            }));

          const inconclusive: EvidenceItem[] = (parsed.inconclusiveIndices || [])
            .map((idx: number) => rawSources[idx - 1])
            .filter(Boolean)
            .map((s: EvidenceSource) => ({
              sourceTitle: s.title,
              sourceUrl: s.url,
              quote: s.snippet,
              date: s.publishedDate,
              relevance: 'inconclusive',
            }));

          return {
            success: true,
            claim,
            searchAvailable: true,
            searchProvider: 'Tavily Search API + Gemini Analysis',
            verdict: parsed.verdict || 'inconclusive',
            summary: parsed.summary || 'Evidence evaluation based on retrieved live web sources.',
            evidence: { supporting, contradicting, inconclusive },
            sources: rawSources.map((s) => ({ title: s.title, url: s.url, date: s.publishedDate })),
            aiInterpretation: parsed.aiInterpretation || 'Synthesized from retrieved accredited news reporting.',
            retrievedAt,
          };
        }
      }
    } catch (e) {
      console.warn('[Gemini Evidence Synthesis Error]', (e as Error).message);
    }
  }

  // 4. Fallback classification if Gemini API key is absent but Tavily search succeeded
  const supporting: EvidenceItem[] = [];

  const inconclusive: EvidenceItem[] = rawSources.map((s) => ({
    sourceTitle: s.title,
    sourceUrl: s.url,
    quote: s.snippet,
    date: s.publishedDate,
    relevance: 'inconclusive',
  }));

  return {
    success: true,
    claim,
    searchAvailable: true,
    searchProvider: 'Tavily Search API',
    verdict: 'inconclusive',
    summary: `Retrieved ${rawSources.length} external web sources matching the claim.`,
    evidence: { supporting, contradicting: [], inconclusive },
    sources: rawSources.map((s) => ({ title: s.title, url: s.url, date: s.publishedDate })),
    aiInterpretation: 'Direct search excerpts retrieved from live web queries. Always verify the underlying primary citations.',
    retrievedAt,
  };
}
