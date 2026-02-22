-- Seed Data (Based on example data)

-- Note: In a real migration, IDs would be generated, but for seeding we might want to reference them.
-- Here we'll just insert and let UUIDs be generated.

-- Shazo family
WITH f AS (
  INSERT INTO familjer (familje_namn, make_namn, make_fodelse_datum, make_manads_avgift, hustru_namn, hustru_fodelse_datum, hustru_manads_avgift, mobil_nummer, mail, adress, ort, post_kod)
  VALUES ('Shazo', 'Paul Shazo', '1990-09-23', 200, 'Jennifer Shazo', '1993-07-14', 200, '704339224', 'paulesho1990@gmail.com', 'Kaverösporten 26', 'Västra Frölunda', '42137')
  RETURNING id
)
INSERT INTO barn (familj_id, ordning, namn, fodelse_datum, manads_avgift)
SELECT id, 1, 'Lavina Shazo', '2016-05-17', 100 FROM f
UNION ALL
SELECT id, 2, 'Leyona Shazo', '2019-11-24', 100 FROM f;

-- Johansson family
WITH f AS (
  INSERT INTO familjer (familje_namn, make_namn, make_fodelse_datum, make_manads_avgift, hustru_namn, hustru_fodelse_datum, hustru_manads_avgift, mobil_nummer, ort)
  VALUES ('Johansson', 'Erik Johannson', '1969-01-01', 200, 'Khwanze Odisho', '1972-01-01', 200, '700000000', 'Västra Frölunda')
  RETURNING id
)
INSERT INTO barn (familj_id, ordning, namn, fodelse_datum, manads_avgift)
SELECT id, 1, 'Peter Johansson', '2022-01-01', 100 FROM f
UNION ALL
SELECT id, 2, 'Warde Johansson', '2020-01-01', 100 FROM f;

-- Baro family
WITH f AS (
  INSERT INTO familjer (familje_namn, make_namn, make_fodelse_datum, make_manads_avgift, hustru_namn, hustru_fodelse_datum, hustru_manads_avgift, mobil_nummer)
  VALUES ('Baro', 'James Baro', '1973-07-07', 200, 'Margreat Oraha', '1987-05-02', 200, '704873845')
  RETURNING id
)
INSERT INTO barn (familj_id, ordning, namn, fodelse_datum, manads_avgift)
SELECT id, 1, 'Broniel Baro', '2019-12-23', 100 FROM f
UNION ALL
SELECT id, 2, 'Edlina Baro', '2022-10-21', 100 FROM f;

-- Seeding some payments
INSERT INTO betalningar (familj_id, total_manads_avgift, total_ars_avgift, summan, betalat_till_datum, betalat_via, betalnings_referens)
SELECT id, 1200, 14400, 7200, '2024-12-31', 'Swish', '123456789' FROM familjer WHERE familje_namn = 'Shazo';

INSERT INTO betalningar (familj_id, total_manads_avgift, total_ars_avgift, summan, betalat_till_datum, betalat_via, betalnings_referens)
SELECT id, 600, 7200, 7200, '2025-12-31', 'Bank Överföring', '5154575859' FROM familjer WHERE familje_namn = 'Johansson';

-- Seeding some expenses/income
INSERT INTO utgifter (manad, vecka, hyra, frukost, rakning, annat, total, rapporterat_av, datum)
VALUES ('Januari', 5, 14000, 4000, 1000, 550, 19550, 'Paul', '2025-02-01');

INSERT INTO intakter (manad, vecka, medlems_avgift, gavor, ungdomar, annat, total, rapporterat_av, datum)
VALUES ('Januari', 5, 1400, 4000, 1000, 550, 6950, 'Paul', '2025-02-01');
