import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  mapPoint,
  mapSession,
  mapTest,
  type MomPoint,
  type OutcomeRow,
  type PointRow,
  type QaSession,
  type SessionRow,
  type TestItem,
  type TestRow,
} from "@/lib/qa";

type Tables = Database["public"]["Tables"];
export type SessionInsert = Omit<Tables["qa_sessions"]["Insert"], "inward_order_id">;
export type SessionPatch = Tables["qa_sessions"]["Update"];
export type TestInsert = Omit<Tables["test_items"]["Insert"], "inward_order_id">;
export type TestPatch = Tables["test_items"]["Update"];
export type PointInsert = Omit<Tables["mom_points"]["Insert"], "inward_order_id">;
export type PointPatch = Tables["mom_points"]["Update"];
export type OutcomePatch = Omit<Tables["inspection_outcomes"]["Insert"], "inward_order_id">;

function upsertById<T extends { id: string }>(list: T[], next: T) {
  return list.some((item) => item.id === next.id)
    ? list.map((item) => (item.id === next.id ? next : item))
    : [...list, next];
}

// Everything the Testing and Inspection pages share, kept live across users.
export function useQaData(orderId: string) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<QaSession[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [points, setPoints] = useState<MomPoint[]>([]);
  const [outcome, setOutcome] = useState<OutcomeRow | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [sessionResult, testResult, pointResult, outcomeResult] = await Promise.all([
        supabase.from("qa_sessions").select("*").eq("inward_order_id", orderId),
        supabase
          .from("test_items")
          .select("*")
          .eq("inward_order_id", orderId)
          .order("display_order"),
        supabase
          .from("mom_points")
          .select("*")
          .eq("inward_order_id", orderId)
          .order("display_order"),
        supabase
          .from("inspection_outcomes")
          .select("*")
          .eq("inward_order_id", orderId)
          .maybeSingle(),
      ]);
      if (!active) return;
      if (sessionResult.error || testResult.error || pointResult.error)
        toast.error("Could not load testing and inspection data");
      setSessions((sessionResult.data ?? []).map(mapSession));
      setTests((testResult.data ?? []).map(mapTest));
      setPoints((pointResult.data ?? []).map(mapPoint));
      setOutcome(outcomeResult.data ?? null);
      setLoading(false);
    }
    void load();

    const filter = `inward_order_id=eq.${orderId}`;
    const removedId = (payload: { old: unknown }) => (payload.old as { id?: string }).id;
    const channel = supabase
      .channel(`qa-${orderId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_sessions", filter },
        (p) => {
          if (p.eventType === "DELETE") setSessions((c) => c.filter((s) => s.id !== removedId(p)));
          else setSessions((c) => upsertById(c, mapSession(p.new as SessionRow)));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_items", filter },
        (p) => {
          if (p.eventType === "DELETE") setTests((c) => c.filter((t) => t.id !== removedId(p)));
          else setTests((c) => upsertById(c, mapTest(p.new as TestRow)));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mom_points", filter },
        (p) => {
          if (p.eventType === "DELETE") setPoints((c) => c.filter((x) => x.id !== removedId(p)));
          else setPoints((c) => upsertById(c, mapPoint(p.new as PointRow)));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspection_outcomes", filter },
        (p) => {
          if (p.eventType !== "DELETE") setOutcome(p.new as OutcomeRow);
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  const saveSession = useCallback(
    async (values: SessionInsert, id?: string) => {
      const query = id
        ? supabase.from("qa_sessions").update(values).eq("id", id)
        : supabase.from("qa_sessions").insert({ ...values, inward_order_id: orderId });
      const { data, error } = await query.select("*").single();
      if (error || !data) {
        toast.error("Could not save the session");
        return null;
      }
      const session = mapSession(data);
      setSessions((c) => upsertById(c, session));
      return session;
    },
    [orderId],
  );

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.from("qa_sessions").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the session");
      return false;
    }
    setSessions((c) => c.filter((s) => s.id !== id));
    setPoints((c) => c.filter((p) => p.sessionId !== id));
    setTests((c) => c.map((t) => (t.sessionId === id ? { ...t, sessionId: undefined } : t)));
    return true;
  }, []);

  const addTests = useCallback(
    async (rows: TestInsert[]) => {
      if (!rows.length) return [];
      const { data, error } = await supabase
        .from("test_items")
        .upsert(
          rows.map((row) => ({ ...row, inward_order_id: orderId })),
          { onConflict: "inward_order_id,test_key", ignoreDuplicates: true },
        )
        .select("*");
      if (error) {
        toast.error("Could not add the tests");
        return [];
      }
      const added = (data ?? []).map(mapTest);
      setTests((c) => added.reduce(upsertById, c));
      return added;
    },
    [orderId],
  );

  const updateTest = useCallback(async (id: string, patch: TestPatch) => {
    const { data, error } = await supabase
      .from("test_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not update the test");
      return null;
    }
    const test = mapTest(data);
    setTests((c) => upsertById(c, test));
    return test;
  }, []);

  const deleteTest = useCallback(async (id: string) => {
    const { error } = await supabase.from("test_items").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove the test");
      return;
    }
    setTests((c) => c.filter((t) => t.id !== id));
  }, []);

  const savePoint = useCallback(
    async (values: PointInsert, id?: string) => {
      const query = id
        ? supabase.from("mom_points").update(values).eq("id", id)
        : supabase.from("mom_points").insert({ ...values, inward_order_id: orderId });
      const { data, error } = await query.select("*").single();
      if (error || !data) {
        toast.error("Could not save the point");
        return null;
      }
      const point = mapPoint(data);
      setPoints((c) => upsertById(c, point));
      return point;
    },
    [orderId],
  );

  const updatePoint = useCallback(async (id: string, patch: PointPatch) => {
    const { data, error } = await supabase
      .from("mom_points")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not update the point");
      return null;
    }
    const point = mapPoint(data);
    setPoints((c) => upsertById(c, point));
    return point;
  }, []);

  const deletePoint = useCallback(async (id: string) => {
    const { error } = await supabase.from("mom_points").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the point");
      return;
    }
    setPoints((c) => c.filter((p) => p.id !== id));
  }, []);

  const saveOutcome = useCallback(
    async (values: OutcomePatch) => {
      const { data, error } = await supabase
        .from("inspection_outcomes")
        .upsert({ ...values, inward_order_id: orderId }, { onConflict: "inward_order_id" })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Could not save the inspection outcome");
        return null;
      }
      setOutcome(data);
      return data;
    },
    [orderId],
  );

  return {
    loading,
    sessions,
    tests,
    points,
    outcome,
    saveSession,
    deleteSession,
    addTests,
    updateTest,
    deleteTest,
    savePoint,
    updatePoint,
    deletePoint,
    saveOutcome,
  };
}

export type QaData = ReturnType<typeof useQaData>;
