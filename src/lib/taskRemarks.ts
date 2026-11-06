import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";

// Remarks on production work, one row per remark with who wrote it and when. The database
// fills in the writer, so several people on one panel each keep their own remarks.

type RemarkRow = Database["public"]["Tables"]["production_task_remarks"]["Row"];

export type TaskRemark = {
  id: string;
  taskId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
};

function mapRemark(row: RemarkRow): TaskRemark {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    authorName: row.author_name || "Someone",
    body: row.body,
    createdAt: row.created_at,
  };
}

/** "9 Oct, 2:37 pm" */
export function remarkTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** All remarks on one order, oldest first per task, with add and remove. */
export function useTaskRemarks(orderId: string) {
  const [remarks, setRemarks] = useState<TaskRemark[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("production_task_remarks")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("created_at");
    setRemarks((data ?? []).map(mapRemark));
  }, [orderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byTask = useMemo(() => {
    const map = new Map<string, TaskRemark[]>();
    for (const r of remarks) map.set(r.taskId, [...(map.get(r.taskId) ?? []), r]);
    return map;
  }, [remarks]);

  async function add(taskId: string, body: string) {
    const { data, error } = await supabase
      .from("production_task_remarks")
      // The database replaces the order id and writer with the real ones.
      .insert({ task_id: taskId, inward_order_id: orderId, body: body.trim() })
      .select()
      .single();
    if (error || !data) return false;
    setRemarks((current) => [...current, mapRemark(data)]);
    return true;
  }

  async function remove(id: string) {
    const { error } = await supabase.from("production_task_remarks").delete().eq("id", id);
    if (error) return false;
    setRemarks((current) => current.filter((r) => r.id !== id));
    return true;
  }

  return { byTask, add, remove, reload };
}
