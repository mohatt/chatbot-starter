import { cosineSimilarity, generateText } from 'ai'
import { models } from './ai';

function isChitchat(text: string) {
  // chitchat / acknowledgements
  return /(hi|hey|hello|greeting|thnx|thanks|thank you|appreciate|cool|perfect|awesome|great|cheers|ok(ay)?|got it)/i.test(text);
}

function isInfoRequest(text: string) {
  // clearly a question
  if (/[?]/.test(text)) return true;
  // wh-words and verbs indicating information request
  return /\b(who|what|when|where|why|how|which|list|summarize|explain|describe|tell|show|give|extract|analyze)\b/i.test(text);
}

const RETRIEVAL_INTENTS = [
  "What does the document say about",
  "According to the file",
  "Based on the uploaded document",
  "Search the document",
  "Summaries based on the document",
  "Find information in the uploaded file",
  "Answer using the document",
  "Look inside the file for relevant information",
];

let RETRIEVAL_INTENTS_EMBEDDINGS: number[][] | null = null;

async function getIntentEmbeddings() {
  if (!RETRIEVAL_INTENTS_EMBEDDINGS) {
    RETRIEVAL_INTENTS_EMBEDDINGS = await models.embedding.embedDocuments(RETRIEVAL_INTENTS);
  }
  return RETRIEVAL_INTENTS_EMBEDDINGS;
}

async function isDocumentRelated(query: number[]) {
  const intents = await getIntentEmbeddings();
  let maxSim = 0;
  for (const emb of intents) {
    maxSim = Math.max(maxSim, cosineSimilarity(query, emb));
  }
  return maxSim > 0.55;
}

async function isDocumentRelatedLLM(userMessage: string, lastAssistantMessage?: string) {
  const prompt = [
    'You are a strict binary classifier.',
    'Decide if the assistant needs to look at uploaded documents to answer the latest user message.',
    'You MUST respond with exactly "yes" or "no" only.',
    lastAssistantMessage ? `Previous assistant reply:\n${lastAssistantMessage}` : 'Previous assistant reply: none',
    `User message:\n${userMessage}`
  ].join('\n\n');

  try {
    const result = await generateText({
      model: models.chat,
      prompt,
      temperature: 0
    });
    return result.text.trim().toLowerCase().startsWith('y');
  } catch (error) {
    console.error('Classifier error', error);
    return false;
  }
}

export async function shouldUseRag(text: string, previousAssistant?: string): Promise<number[] | false> {
  const t = text.trim().toLowerCase();
  if (!t) return false;

  const query = await models.embedding.embedQuery(text);

  // info request → likely needs RAG
  if (isInfoRequest(t)) return query;

  // catch obvious non-RAG queries instantly
  if (isChitchat(t)) return false;

  // short pronoun-based follow-ups ALWAYS require context
  if (t.split(' ').length <= 3) return query;

  // semantic similarity against retrieval intent examples (MiniLM)
  const semantic = await isDocumentRelated(query);
  if (semantic) return query;

  // final tie-breaker: LLM classifier
  const classifier = await isDocumentRelatedLLM(t, previousAssistant);
  return classifier && query;
}
