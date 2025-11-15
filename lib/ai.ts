import { createHuggingFace } from '@ai-sdk/huggingface';
import { createOpenAI } from '@ai-sdk/openai';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { OpenAIEmbeddings } from '@langchain/openai';
import { env, assertEnv } from './env';

function createModels() {
  const {
    HUGGING_FACE_API_KEY,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    AI_MODEL,
    EMBEDDING_MODEL,
  } = env;

  if (HUGGING_FACE_API_KEY) {
    const apiKey = assertEnv(HUGGING_FACE_API_KEY, 'HUGGING_FACE_API_KEY');
    const huggingFace = createHuggingFace({ apiKey });
    return {
      chat: huggingFace(AI_MODEL ?? 'meta-llama/Llama-3.1-8B-Instruct'),
      embedding: new HuggingFaceInferenceEmbeddings({
        apiKey,
        model: EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2',
        provider: 'auto'
      })
    };
  }

  if (OPENAI_API_KEY) {
    const apiKey = assertEnv(OPENAI_API_KEY, 'OPENAI_API_KEY');
    const openai = createOpenAI({ apiKey, baseURL: OPENAI_BASE_URL });
    return {
      chat: openai(AI_MODEL ?? 'gpt-4o-mini'),
      embedding: new OpenAIEmbeddings({
        apiKey,
        model: EMBEDDING_MODEL ?? 'text-embedding-3-small',
      })
    };
  }

  throw new Error('Provide HUGGING_FACE_API_KEY or OPENAI_API_KEY for AI models access.');
}

export const models = createModels();
