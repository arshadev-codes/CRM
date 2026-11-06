-- Field staff with "view_design" get the drawings only: never the BOM / cost sheet (it holds
-- prices) and not the other Design files.
DROP POLICY "read" ON public.stage_updates;
CREATE POLICY "read" ON public.stage_updates FOR SELECT TO authenticated USING (
  public.full_view() OR (
    stage_name = 'Design' AND kind <> 'bom' AND public.can_view('view_design')
    AND public.can_read_order(inward_order_id)
    AND (storage_path IS NULL OR (storage.foldername(storage_path))[4] = 'drawings')
  )
);

DROP POLICY "order files read" ON storage.objects;
CREATE POLICY "order files read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'inward-order-attachments' AND (
    public.full_view() OR (
      (storage.foldername(name))[2] = 'stages' AND (storage.foldername(name))[3] = 'design'
      AND (storage.foldername(name))[4] = 'drawings'
      AND public.can_view('view_design')
      AND (storage.foldername(name))[1] IN (SELECT o::text FROM public.my_order_ids() o)
    )
  )
);
