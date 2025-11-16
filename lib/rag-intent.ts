import { cosineSimilarity, generateText } from 'ai';
import { models } from './ai';

function isChitchat(text: string) {
  const quickHits =
    /(hi|hey|hello|greetings?|yo|sup|hru|thx|thanks|thank you|appreciate|cool|perfect|awesome|amazing|sweet|cheers|ok(ay)?|got it|no worries|you're welcome|np)/i;
  if (quickHits.test(text)) return true;

  const phrases = [
    'sounds good',
    'looks good',
    'makes sense',
    'great, thanks',
    'all good',
    'that helps',
    'appreciate it',
    'much appreciated',
    'thank u',
    'thankyou',
    'thanks a lot'
  ];
  return phrases.some((phrase) => text.includes(phrase))
}

function isInfoRequest(text: string) {
  // clearly a question
  if (/[?]/.test(text)) return true;
  // wh-words and verbs indicating information request
  const keywords =
    /\b(who|what|when|where|why|how|which|list|summarize|summaries|explain|describe|tell|show|give|extract|analyze|examine|compare|detail|outline|clarify|provide|identify|count|how many|steps|instructions|process)\b/i;
  if (keywords.test(text)) return true;

  return text.length > 40;
}

function isReferential(text: string) {
  const cues = [
    "his",
    "her",
    "their",
    "its",
    "that",
    "this",
    "those",
    "which",
    "the second",
    "the first",
    "the last",
    "what about",
    "address",
    "email",
    "date",
    "value",
    "number",
  ];

  return cues.some((c) => text.includes(c));
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
    RETRIEVAL_INTENTS_EMBEDDINGS = await models.embedding.embedMany(RETRIEVAL_INTENTS);
  }
  return RETRIEVAL_INTENTS_EMBEDDINGS;
}

async function isDocumentRelated(query: number[]) {
  const intents = await getIntentEmbeddings();
  let maxSim = 0;
  for (const emb of intents) {
    maxSim = Math.max(maxSim, cosineSimilarity(query, emb));
  }
  return maxSim > 0.5;
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

export async function shouldUseRag(userMessage: string, previousAssistant?: string): Promise<number[] | false> {
  const text = userMessage.trim().toLowerCase();
  if (!text) return false;

  // embed the query on-demand
  const embed = () => models.embedding.embed(userMessage);

  // info request → likely needs RAG
  if (isInfoRequest(text) || isReferential(text)) return embed();

  // catch obvious non-RAG queries instantly
  if (isChitchat(text)) return false;

  // short pronoun-based follow-ups ALWAYS require context
  if (text.split(/\s+/).length <= 3) return embed();

  // semantic similarity against retrieval intent examples (MiniLM)
  const vector = await embed();
  if (await isDocumentRelated(vector)) return vector;

  // final tie-breaker: LLM classifier
  const llmResult = await isDocumentRelatedLLM(userMessage, previousAssistant);
  return llmResult && vector;
}
