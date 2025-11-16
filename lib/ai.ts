import { gateway } from '@ai-sdk/gateway';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { embed, embedMany } from 'ai';
import { env, defaults } from './env';

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
      embed: (value) => embed({ model: embedding, value }).then((res) => res.embedding),
      embedMany: (values) => embedMany({ model: embedding, values }).then((res) => res.embeddings),
    }
  };
}

export const models = createModels();
