CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  _dispute_id uuid,
  _status text,
  _resolution text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _status NOT IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid dispute status';
  END IF;

  UPDATE public.disputes
  SET status = _status,
      resolution = left(nullif(trim(coalesce(_resolution, '')), ''), 2000),
      resolved_at = now()
  WHERE id = _dispute_id
    AND status IN ('open', 'investigating');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Open dispute not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(uuid, text, text) TO authenticated;