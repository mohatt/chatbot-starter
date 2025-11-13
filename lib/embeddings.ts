import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { embed } from 'ai';
import { OpenAIEmbeddings } from '@langchain/openai';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { env, defaults, assertEnv } from './env';

export function createEmbeddings(): EmbeddingsInterface {
  if (env.HF_ACCESS_TOKEN) {
    return new HuggingFaceInferenceEmbeddings({
      apiKey: env.HF_ACCESS_TOKEN,
      model: defaults.embeddingModel
    });
  }

  if (env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings({
      apiKey: assertEnv(env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
      model: defaults.embeddingModel
    });
  }

  throw new Error('Provide HF_ACCESS_TOKEN or OPENAI_API_KEY for embeddings.');
}
