-- 1. Bytt namn på födelsedatum-kolumnerna till personnummer
ALTER TABLE familjer RENAME COLUMN make_fodelse_datum TO make_personnummer;
ALTER TABLE familjer RENAME COLUMN hustru_fodelse_datum TO hustru_personnummer;
ALTER TABLE barn RENAME COLUMN fodelse_datum TO personnummer;

-- 2. Ändra datatyp från DATE till TEXT för att tillåta 12 siffror (ÅÅÅÅMMDDNNNN)
ALTER TABLE familjer ALTER COLUMN make_personnummer TYPE TEXT;
ALTER TABLE familjer ALTER COLUMN hustru_personnummer TYPE TEXT;
ALTER TABLE barn ALTER COLUMN personnummer TYPE TEXT;

-- 3. Lägg till den nya kolumnen för "Land"
ALTER TABLE familjer ADD COLUMN IF NOT EXISTS land TEXT DEFAULT 'Sverige';

-- 4. Rensa gamla versioner av funktionerna (för att undvika konflikter)
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB[]);
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB);
DROP FUNCTION IF EXISTS update_family_with_children(UUID, JSONB, JSONB);

-- 5. Skapa den uppdaterade LÄGG TILL-funktionen (med personnummer och land)
CREATE OR REPLACE FUNCTION add_family_with_children(
  family_data JSONB,
  children_data JSONB
) RETURNS UUID AS $$
DECLARE
  new_family_id UUID;
  child_data JSONB;
BEGIN
  -- Lägg in familjen
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

  -- Lägg in barn
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


-- 6. Skapa den uppdaterade REDIGERA-funktionen (med personnummer och land)
CREATE OR REPLACE FUNCTION update_family_with_children(
  p_family_id UUID,
  family_data JSONB,
  children_data JSONB
) RETURNS VOID AS $$
DECLARE
  child_data JSONB;
BEGIN
  -- Uppdatera familjens data
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

  -- Ta bort gamla barn
  DELETE FROM barn WHERE familj_id = p_family_id;

  -- Sätt in uppdaterade barn
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
