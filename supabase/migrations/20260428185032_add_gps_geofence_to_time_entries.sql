CREATE OR REPLACE FUNCTION public.distance_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT 6371000 * 2 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lon2 - lon1) / 2)), 2)
    )
  )
$$;

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS clock_in_latitude double precision,
  ADD COLUMN IF NOT EXISTS clock_in_longitude double precision,
  ADD COLUMN IF NOT EXISTS clock_in_accuracy_meters double precision,
  ADD COLUMN IF NOT EXISTS clock_in_distance_meters double precision;

CREATE OR REPLACE FUNCTION public.validate_clock_in_geofence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _job_lat double precision;
  _job_lon double precision;
  _distance double precision;
BEGIN
  IF NEW.clock_in_at IS NOT NULL
    AND (TG_OP = 'INSERT' OR OLD.clock_in_at IS NULL OR NEW.clock_in_at IS DISTINCT FROM OLD.clock_in_at) THEN
    SELECT latitude, longitude INTO _job_lat, _job_lon
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF _job_lat IS NULL OR _job_lon IS NULL THEN
      RAISE EXCEPTION 'This job does not have a GPS pin yet';
    END IF;

    IF NEW.clock_in_latitude IS NULL OR NEW.clock_in_longitude IS NULL THEN
      RAISE EXCEPTION 'GPS location is required to clock in';
    END IF;

    _distance := public.distance_meters(NEW.clock_in_latitude, NEW.clock_in_longitude, _job_lat, _job_lon);
    NEW.clock_in_distance_meters := _distance;

    IF _distance > 100 THEN
      RAISE EXCEPTION 'You are outside the 100 meter job radius';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_clock_in_geofence ON public.time_entries;
CREATE TRIGGER validate_clock_in_geofence
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.validate_clock_in_geofence();
