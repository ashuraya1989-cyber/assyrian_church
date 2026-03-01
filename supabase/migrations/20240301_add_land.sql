-- Add land column to familjer
ALTER TABLE familjer ADD COLUMN IF NOT EXISTS land TEXT DEFAULT 'Sverige';

-- Recreate add_family_with_children to include land
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
    mobil_nummer, mail, adress, ort, post_kod, land
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
    family_data->>'post_kod',
    COALESCE(family_data->>'land', 'Sverige')
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

-- Recreate update_family_with_children to include land
CREATE OR REPLACE FUNCTION update_family_with_children(
  p_family_id UUID,
  family_data JSONB,
  children_data JSONB
) RETURNS VOID AS $$
DECLARE
  child_data JSONB;
BEGIN
  -- Update family record
  UPDATE familjer SET
    familje_namn = family_data->>'familje_namn',
    make_namn = family_data->>'make_namn',
    make_personnummer = NULLIF(family_data->>'make_personnummer', ''),
    make_manads_avgift = COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
    hustru_namn = family_data->>'hustru_namn',
    hustru_personnummer = NULLIF(family_data->>'hustru_personnummer', ''),
    hustru_manads_avgift = COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
    mobil_nummer = family_data->>'mobil_nummer',
    mail = family_data->>'mail',
    adress = family_data->>'adress',
    ort = family_data->>'ort',
    post_kod = family_data->>'post_kod',
    land = COALESCE(family_data->>'land', 'Sverige')
  WHERE id = p_family_id;

  -- Clear all existing children for this family
  DELETE FROM barn WHERE familj_id = p_family_id;

  -- Insert the nested children data 
  IF children_data IS NOT NULL AND jsonb_typeof(children_data) = 'array' THEN
    FOR child_data IN SELECT * FROM jsonb_array_elements(children_data)
    LOOP
      IF child_data->>'namn' IS NOT NULL AND child_data->>'namn' != '' THEN
        INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
        VALUES (
          p_family_id,
          COALESCE((child_data->>'ordning')::INTEGER, 1),
          child_data->>'namn',
          NULLIF(child_data->>'personnummer', ''),
          COALESCE((child_data->>'manads_avgift')::INTEGER, 100)
        );
      END IF;
    END LOOP;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
