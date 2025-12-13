import { toNextJsHandler } from "better-auth/next-js";
import { Api } from '@/lib/api'
const api = new Api()
export const { POST, GET } = toNextJsHandler(api.betterAuth.client);
