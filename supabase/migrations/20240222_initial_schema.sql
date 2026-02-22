-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Familjer
CREATE TABLE IF NOT EXISTS familjer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familje_namn TEXT NOT NULL,
  make_namn TEXT NOT NULL,
  make_fodelse_datum DATE,
  make_manads_avgift INTEGER DEFAULT 200,
  hustru_namn TEXT,
  hustru_fodelse_datum DATE,
  hustru_manads_avgift INTEGER DEFAULT 200,
  mobil_nummer TEXT,
  mail TEXT,
  adress TEXT,
  ort TEXT,
  post_kod TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Barn
CREATE TABLE IF NOT EXISTS barn (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familj_id UUID REFERENCES familjer(id) ON DELETE CASCADE,
  ordning INTEGER NOT NULL CHECK (ordning BETWEEN 1 AND 6),
  namn TEXT NOT NULL,
  fodelse_datum DATE,
  manads_avgift INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Betalningar
CREATE TABLE IF NOT EXISTS betalningar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familj_id UUID REFERENCES familjer(id) ON DELETE CASCADE,
  total_manads_avgift INTEGER,
  total_ars_avgift INTEGER,
  summan INTEGER,
  betalat_till_datum DATE,
  betalat_via TEXT CHECK (betalat_via IN ('Swish', 'Bank Överföring', 'Kontant', 'Annat')),
  betalnings_referens TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Utgifter
CREATE TABLE IF NOT EXISTS utgifter (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manad TEXT NOT NULL,
  vecka INTEGER NOT NULL,
  hyra INTEGER DEFAULT 0,
  frukost INTEGER DEFAULT 0,
  rakning INTEGER DEFAULT 0,
  annat INTEGER DEFAULT 0,
  kommentar TEXT,
  total INTEGER,
  rapporterat_av TEXT,
  datum DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Intäkter
CREATE TABLE IF NOT EXISTS intakter (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manad TEXT NOT NULL,
  vecka INTEGER NOT NULL,
  medlems_avgift INTEGER DEFAULT 0,
  gavor INTEGER DEFAULT 0,
  ungdomar INTEGER DEFAULT 0,
  annat INTEGER DEFAULT 0,
  kommentar TEXT,
  total INTEGER,
  rapporterat_av TEXT,
  datum DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Simple version: authenticated users can do everything)
ALTER TABLE familjer ENABLE ROW LEVEL SECURITY;
ALTER TABLE barn ENABLE ROW LEVEL SECURITY;
ALTER TABLE betalningar ENABLE ROW LEVEL SECURITY;
ALTER TABLE utgifter ENABLE ROW LEVEL SECURITY;
ALTER TABLE intakter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to familjer" ON familjer FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to barn" ON barn FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to betalningar" ON betalningar FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to utgifter" ON utgifter FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to intakter" ON intakter FOR ALL TO authenticated USING (true);

-- RPC to add family and children atomically
CREATE OR REPLACE FUNCTION add_family_with_children(
  family_data JSONB,
  children_data JSONB[]
) RETURNS UUID AS $$
DECLARE
  new_family_id UUID;
  child_data JSONB;
BEGIN
  -- Insert family
  INSERT INTO familjer (
    familje_namn, make_namn, make_fodelse_datum, make_manads_avgift,
    hustru_namn, hustru_fodelse_datum, hustru_manads_avgift,
    mobil_nummer, mail, adress, ort, post_kod
  ) VALUES (
    family_data->>'familje_namn',
    family_data->>'make_namn',
    NULLIF(family_data->>'make_fodelse_datum', '')::DATE,
    COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
    family_data->>'hustru_namn',
    NULLIF(family_data->>'hustru_fodelse_datum', '')::DATE,
    COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
    family_data->>'mobil_nummer',
    family_data->>'mail',
    family_data->>'adress',
    family_data->>'ort',
    family_data->>'post_kod'
  ) RETURNING id INTO new_family_id;

  -- Insert children
  IF children_data IS NOT NULL THEN
    FOREACH child_data IN ARRAY children_data
    LOOP
      IF child_data->>'namn' IS NOT NULL AND child_data->>'namn' != '' THEN
        INSERT INTO barn (familj_id, ordning, namn, fodelse_datum, manads_avgift)
        VALUES (
          new_family_id,
          COALESCE((child_data->>'ordning')::INTEGER, 1),
          child_data->>'namn',
          NULLIF(child_data->>'fodelse_datum', '')::DATE,
          COALESCE((child_data->>'manads_avgift')::INTEGER, 100)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN new_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
