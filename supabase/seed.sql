-- Seed Data (Test data only — no real PII)

-- Test family 1
WITH f AS (
  INSERT INTO familjer (familje_namn, make_namn, make_personnummer, make_manads_avgift, hustru_namn, hustru_personnummer, hustru_manads_avgift, mobil_nummer, mail, adress, ort, post_kod)
  VALUES ('Testsson', 'Test Testsson', '199001010000', 200, 'Testa Testsson', '199201010000', 200, '700000001', 'test1@example.com', 'Testgatan 1', 'Teststad', '12345')
  RETURNING id
)
INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
SELECT id, 1, 'Barn Testsson', '201501010000', 100 FROM f
UNION ALL
SELECT id, 2, 'Barn2 Testsson', '201701010000', 100 FROM f;

-- Test family 2
WITH f AS (
  INSERT INTO familjer (familje_namn, make_namn, make_personnummer, make_manads_avgift, hustru_namn, hustru_personnummer, hustru_manads_avgift, mobil_nummer, mail, ort)
  VALUES ('Exempelsson', 'Exempel Exempelsson', '198501010000', 200, 'Exempela Exempelsson', '198701010000', 200, '700000002', 'test2@example.com', 'Exempelstad')
  RETURNING id
)
INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
SELECT id, 1, 'Barn Exempelsson', '201801010000', 100 FROM f;

-- Test family 3
WITH f AS (
  INSERT INTO familjer (familje_namn, make_namn, make_personnummer, make_manads_avgift, hustru_namn, hustru_personnummer, hustru_manads_avgift, mobil_nummer)
  VALUES ('Demosson', 'Demo Demosson', '197001010000', 200, 'Demoa Demosson', '197201010000', 200, '700000003')
  RETURNING id
)
INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
SELECT id, 1, 'Barn Demosson', '201901010000', 100 FROM f;

-- Test payments
INSERT INTO betalningar (familj_id, total_manads_avgift, total_ars_avgift, summan, betalat_till_datum, betalat_via, betalnings_referens)
SELECT id, 1200, 14400, 7200, '2025-12-31', 'Swish', 'TEST-001' FROM familjer WHERE familje_namn = 'Testsson';

INSERT INTO betalningar (familj_id, total_manads_avgift, total_ars_avgift, summan, betalat_till_datum, betalat_via, betalnings_referens)
SELECT id, 600, 7200, 7200, '2025-12-31', 'Bank Överföring', 'TEST-002' FROM familjer WHERE familje_namn = 'Exempelsson';

-- Test expenses/income
INSERT INTO utgifter (manad, vecka, hyra, frukost, rakning, annat, total, rapporterat_av, datum)
VALUES ('Januari', 5, 14000, 4000, 1000, 550, 19550, 'Admin', '2025-02-01');

INSERT INTO intakter (manad, vecka, medlems_avgift, gavor, ungdomar, annat, total, rapporterat_av, datum)
VALUES ('Januari', 5, 1400, 4000, 1000, 550, 6950, 'Admin', '2025-02-01');
