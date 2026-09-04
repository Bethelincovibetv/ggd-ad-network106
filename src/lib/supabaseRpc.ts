import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type RpcResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Calls RPCs added after the checked-in generated schema types were created.
 * The database remains the source of truth for these function names and args.
 */
export const callRpc = <T = unknown>(
  functionName: string,
  args: Record<string, unknown>,
): Promise<RpcResponse<T>> => {
  const rpc = supabase.rpc as unknown as (
    name: string,
    parameters: Record<string, unknown>,
  ) => Promise<RpcResponse<T>>;

  return rpc(functionName, args);
};