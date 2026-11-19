ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_review_length CHECK (review IS NULL OR char_length(review) <= 1000);

CREATE OR REPLACE FUNCTION public.driver_reviews(_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF NOT public.has_role(_driver_id, 'driver') THEN
    RAISE EXCEPTION 'Driver reviews unavailable';
  END IF;

  IF NOT (
    (auth.uid() = _driver_id AND public.has_role(auth.uid(), 'driver'))
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.driver_id = _driver_id
        AND auth.uid() IN (b.shipper_id, b.driver_id)
    )
  ) THEN
    RAISE EXCEPTION 'Driver reviews unavailable';
  END IF;

  SELECT jsonb_build_object(
    'average', COALESCE((
      SELECT round(avg(r.rating)::numeric, 1)
      FROM public.ratings r WHERE r.ratee_id = _driver_id
    ), 0),
    'total', (
      SELECT count(*) FROM public.ratings r WHERE r.ratee_id = _driver_id
    ),
    'reviews', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', recent.rating,
          'review', recent.review,
          'created_at', recent.created_at
        ) ORDER BY recent.created_at DESC
      )
      FROM (
        SELECT r.rating, r.review, r.created_at
        FROM public.ratings r
        WHERE r.ratee_id = _driver_id
        ORDER BY r.created_at DESC
        LIMIT 20
      ) recent
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.driver_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_reviews(uuid) TO authenticated;