-- Drop BOTH possible existing candidates to clear the overload confusion
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB[]);
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB);

-- Recreate with JSONB for children_data to easily accept JS arrays
CREATE OR REPLACE FUNCTION add_family_with_children(
  family_data JSONB,
  children_data JSONB
) RETURNS UUID AS $$
DECLARE
  new_family_id UUID;
  child_data JSONB;
BEGIN
  -- Insert family
  INSERT INTO familjer (
    familje_namn, make_namn, make_personnummer, make_manads_avgift,
    hustru_namn, hustru_personnummer, hustru_manads_avgift,
    mobil_nummer, mail, adress, ort, post_kod
  ) VALUES (
    family_data->>'familje_namn',
    family_data->>'make_namn',
    NULLIF(family_data->>'make_personnummer', ''),
    COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
    family_data->>'hustru_namn',
    NULLIF(family_data->>'hustru_personnummer', ''),
    COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
    family_data->>'mobil_nummer',
    family_data->>'mail',
    family_data->>'adress',
    family_data->>'ort',
    family_data->>'post_kod'
  ) RETURNING id INTO new_family_id;

  -- Insert children
  IF children_data IS NOT NULL AND jsonb_typeof(children_data) = 'array' THEN
    FOR child_data IN SELECT * FROM jsonb_array_elements(children_data)
    LOOP
      IF child_data->>'namn' IS NOT NULL AND child_data->>'namn' != '' THEN
        INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
        VALUES (
          new_family_id,
          COALESCE((child_data->>'ordning')::INTEGER, 1),
          child_data->>'namn',
          NULLIF(child_data->>'personnummer', ''),
          COALESCE((child_data->>'manads_avgift')::INTEGER, 100)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN new_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
