import { toNextJsHandler } from "better-auth/next-js";
import { Api } from '@/lib/api'

export const { POST, GET } = toNextJsHandler(Api.getInstance().auth.client);
