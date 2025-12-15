import type { BetterAuthClientPlugin } from "better-auth/client";
import type { billing } from "./index";

export function billingClient(){
  return {
    id: "billing",
    $InferServerPlugin: {} as ReturnType<typeof billing>,
  } satisfies BetterAuthClientPlugin;
}
