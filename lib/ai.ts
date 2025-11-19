import { gateway } from '@ai-sdk/gateway';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { embed, embedMany } from 'ai';
import { env } from './env';

export const defaults = {
  gateway: {
    // chat: 'openai/gpt-4o-mini',
    chat: 'meta/llama-3.1-8b', // good low-cost model with tool support
    // chat: 'meituan/longcat-flash-chat', // very good free model but latency is high
    embedding: 'openai/text-embedding-3-small',
  },
  hf: {
    chat: 'meta-llama/Llama-3.1-8B-Instruct'
  }
} as const

export interface Models {
  chat: ReturnType<typeof gateway>;
  embedding: {
    model: ReturnType<typeof gateway['textEmbeddingModel']>;
    embed(value: string): Promise<number[]>;
    embedMany(values: string[]): Promise<number[][]>;
  }
}

function createModels(): Models {
  const {
    HUGGING_FACE_API_KEY,
    AI_MODEL,
    EMBEDDING_MODEL,
  } = env;

  const chat = HUGGING_FACE_API_KEY
   ? createHuggingFace({ apiKey: HUGGING_FACE_API_KEY })(AI_MODEL ?? defaults.hf.chat)
   : gateway(AI_MODEL ?? defaults.gateway.chat)
  const embedding = gateway.textEmbeddingModel(EMBEDDING_MODEL ?? defaults.gateway.embedding);

  return {
    chat,
    embedding: {
      model: embedding,
      embed: (value) => embed({ model: embedding, value, providerOptions: { openai: { dimensions: 1024 } } }).then((res) => res.embedding),
      embedMany: (values) => embedMany({ model: embedding, values, providerOptions: { openai: { dimensions: 1024 } } }).then((res) => res.embeddings),
    }
  };
}

export const models = createModels();
