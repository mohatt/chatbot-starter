import { createHuggingFace } from '@ai-sdk/huggingface'
import { createOpenAI } from '@ai-sdk/openai'
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { OpenAIEmbeddings } from '@langchain/openai';
import { env, defaults, assertEnv } from './env';

export function createModels() {
  const { chatModel, embeddingModel } = defaults

  if (env.HUGGING_FACE_API_KEY) {
    const apiKey = assertEnv(env.HUGGING_FACE_API_KEY, 'HUGGING_FACE_API_KEY');
    const huggingFace = createHuggingFace({ apiKey });
    return {
      chat: huggingFace(chatModel),
      embedding: new HuggingFaceInferenceEmbeddings({
        apiKey,
        model: embeddingModel,
        provider: 'auto',
      })
    }
  }

  if (env.OPENAI_API_KEY) {
    const apiKey = assertEnv(env.OPENAI_API_KEY, 'OPENAI_API_KEY');
    const openai = createOpenAI({ apiKey, baseURL: env.OPENAI_BASE_URL });
    return {
      chat: openai(chatModel),
      embedding: new OpenAIEmbeddings({
        apiKey,
        model: embeddingModel
      })
    }
  }

  throw new Error('Provide HUGGING_FACE_API_KEY or OPENAI_API_KEY for AI models access.');
}
