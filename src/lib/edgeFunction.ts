import { supabase as cloud } from "@/integrations/supabase/client";

export type FunctionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Calls a Supabase Edge Function and turns any failure into a readable message,
// including the { error } body the function replied with.
export async function callFunction<T extends object>(
  name: string,
  body: Record<string, unknown>,
): Promise<FunctionResult<T>> {
  try {
    const { data, error } = await cloud.functions.invoke<T & { error?: string }>(name, { body });
    if (!error && data && !data.error) return { ok: true, data };
    let message = data?.error ?? error?.message ?? "Something went wrong";
    const context = (error as { context?: Response } | null)?.context;
    if (context && typeof context.json === "function") {
      const reply = (await context.json().catch(() => null)) as { error?: string } | null;
      if (reply?.error) message = reply.error;
    }
    return { ok: false, error: message };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Something went wrong" };
  }
}
