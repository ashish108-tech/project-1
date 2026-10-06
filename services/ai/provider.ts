export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type RetrievedSource = { title: string; source: string; content: string };

export type AiProvider = {
  generateEmbedding(input: string): Promise<number[]>;
  generatePreliminaryGuidance(input: { messages: ChatTurn[]; retrievedSources: RetrievedSource[] }): Promise<string>;
};

function getProviderConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  if (!apiKey) throw new Error('AI provider is not configured.');
  return { apiKey, endpoint: `${base.replace(/\/$/, '')}`, model, embeddingModel };
}

class OpenAiCompatibleProvider implements AiProvider {
  async generateEmbedding(input: string) {
    const { apiKey, endpoint, embeddingModel } = getProviderConfig();
    const response = await fetch(`${endpoint}/embeddings`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: embeddingModel, input }), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Embedding provider request failed with status ${response.status}.`);
    const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding?.length) throw new Error('Embedding provider returned an empty vector.');
    return embedding;
  }

  async generatePreliminaryGuidance({ messages, retrievedSources }: { messages: ChatTurn[]; retrievedSources: RetrievedSource[] }) {
    const { apiKey, endpoint, model } = getProviderConfig();
    const evidence = retrievedSources.map((item, index) => `[Source ${index + 1}] ${item.title}\nPublished source: ${item.source}\nEvidence:\n${item.content}`).join('\n\n');
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are HealthConnect AI, a preliminary health-information assistant. Never claim to diagnose, never prescribe medication, and never imply you replace a clinician. Use only the approved evidence supplied below for medical claims. If the evidence does not answer the question, say that approved evidence is insufficient and recommend qualified professional evaluation. Do not invent citations or sources. Cite supplied evidence inline as [Source 1], [Source 2]. Give concise, uncertainty-aware guidance. Recommend emergency care if symptoms sound urgent.\n\nAPPROVED EVIDENCE:\n' + evidence },
          ...messages,
        ],
        max_completion_tokens: 700,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}.`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('AI provider returned an empty response.');
    return content;
  }
}

export function createAiProvider(): AiProvider { return new OpenAiCompatibleProvider(); }
