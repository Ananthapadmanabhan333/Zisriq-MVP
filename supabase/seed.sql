-- =============================================================================
-- Seed data — LOCAL DEVELOPMENT ONLY.
--
-- Two firms with deliberately overlapping shapes of work, so that cross-tenant
-- isolation is testable against realistic data rather than toy rows. All UUIDs
-- are fixed so tests can reference them.
--
-- Every account below uses the password `Password123!`. This file is never run
-- against production — `supabase db push` applies migrations only.
--
-- PANs and GSTINs are synthetic but structurally valid: the GSTIN check digits
-- are genuine mod-36 values, so src/lib/validation/india.ts accepts them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auth users. The on_auth_user_created trigger creates the matching profiles.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000001-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'priya@deshmukhca.example',
   extensions.crypt('Password123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Priya Deshmukh"}'::jsonb, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000001-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'rahul@deshmukhca.example',
   extensions.crypt('Password123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Rahul Kulkarni"}'::jsonb, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000001-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'sneha@deshmukhca.example',
   extensions.crypt('Password123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Sneha Patil"}'::jsonb, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'b0000002-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'venkat@iyervenkat.example',
   extensions.crypt('Password123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Venkatraman Iyer"}'::jsonb, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'b0000002-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'lakshmi@iyervenkat.example',
   extensions.crypt('Password123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Lakshmi Raman"}'::jsonb, '', '', '', '');

-- Email identities, required by GoTrue for password sign-in.
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email::text, 'email_verified', true),
  'email',
  u.email::text,
  now(), now(), now()
from auth.users u
where u.email like '%@deshmukhca.example' or u.email like '%@iyervenkat.example';

-- -----------------------------------------------------------------------------
-- Firms
-- -----------------------------------------------------------------------------
insert into public.firms (id, name, email_sender_name, reminder_follow_up_days, portal_token_ttl_days)
values
  ('11111111-1111-4111-8111-111111111111', 'Deshmukh & Associates', 'Deshmukh & Associates', '{3,7}', 30),
  ('22222222-2222-4222-8222-222222222222', 'Iyer Venkatraman & Co.', 'Iyer Venkatraman & Co.', '{2,5,10}', 21);

-- -----------------------------------------------------------------------------
-- Memberships
-- -----------------------------------------------------------------------------
insert into public.memberships (firm_id, user_id, role) values
  ('11111111-1111-4111-8111-111111111111', 'a0000001-0000-4000-8000-000000000001', 'admin'),
  ('11111111-1111-4111-8111-111111111111', 'a0000001-0000-4000-8000-000000000002', 'accountant'),
  ('11111111-1111-4111-8111-111111111111', 'a0000001-0000-4000-8000-000000000003', 'staff'),
  ('22222222-2222-4222-8222-222222222222', 'b0000002-0000-4000-8000-000000000001', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'b0000002-0000-4000-8000-000000000002', 'accountant');

-- -----------------------------------------------------------------------------
-- Clients
-- -----------------------------------------------------------------------------
insert into public.clients (id, firm_id, name, type, pan, gstin, contact_name, contact_email, contact_phone, notes)
values
  -- Deshmukh & Associates (Pune, Maharashtra — GST state code 27)
  ('c1000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Kirloskar Auto Components Pvt Ltd', 'company', 'AABCK1429P', '27AABCK1429P1Z9',
   'Anil Kirloskar', 'accounts@kirloskarauto.example', '+91 98220 41123',
   'Monthly GST plus statutory audit. Sales register usually arrives late.'),

  ('c1000001-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'Deshpande & Sons', 'partnership', 'AADFR8821L', '27AADFR8821L1ZS',
   'Milind Deshpande', 'milind@deshpandesons.example', '+91 99700 22881', null),

  ('c1000001-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Sunrise Traders', 'proprietorship', 'ABLPS4417Q', '27ABLPS4417Q1ZU',
   'Sunita Shah', 'sunrise.traders@example.com', '+91 97640 33218',
   'Proprietor files under her individual PAN — expected, not an error.'),

  ('c1000001-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'Nandini Sharma', 'individual', 'AKQPN3382F', null,
   'Nandini Sharma', 'nandini.sharma@example.com', '+91 90280 77410',
   'Salaried, ITR-1. No GST registration.'),

  ('c1000001-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111',
   'Nivara Housing Finance Pvt Ltd', 'company', 'AAGCN9034H', '27AAGCN9034H1Z9',
   'Rohan Joshi', 'finance@nivarahfc.example', '+91 20 6620 4400', null),

  -- Iyer Venkatraman & Co. (Chennai, Tamil Nadu — GST state code 33)
  ('c2000002-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Vaigai Spinning Mills Pvt Ltd', 'company', 'AAECV5567K', '33AAECV5567K1ZX',
   'R. Chandrasekar', 'accounts@vaigaimills.example', '+91 98410 55672', null),

  ('c2000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Murugan Agencies', 'partnership', 'AAJFM2290R', '33AAJFM2290R1ZR',
   'K. Murugan', 'murugan.agencies@example.com', '+91 94440 22903', null),

  ('c2000002-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'Ilango Provision Stores', 'proprietorship', 'AKQPI7712B', '33AKQPI7712B1ZE',
   'S. Ilango', 'ilango.stores@example.com', '+91 93810 77120', null),

  ('c2000002-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222',
   'Sundaram Constructions Pvt Ltd', 'company', 'AACCS3318N', '33AACCS3318N1ZB',
   'Meena Sundaram', 'meena@sundaramconstructions.example', '+91 44 2851 7700',
   'TDS on contractor payments — Form 26Q every quarter.');

-- -----------------------------------------------------------------------------
-- Checklist templates
-- -----------------------------------------------------------------------------
insert into public.checklist_templates (id, firm_id, name, description) values
  ('71000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'GST Monthly — GSTR-1 & 3B', 'Standard monthly document set for a GST-registered client.'),
  ('71000001-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'ITR — Individual (Salaried)', 'Annual return for a salaried individual.'),
  ('71000001-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Statutory Audit — Private Limited', 'Year-end audit pack for a private limited company.'),
  ('72000002-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'GST Monthly — GSTR-1 & 3B', 'Monthly GST document set.'),
  ('72000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'TDS Quarterly — Form 26Q', 'Quarterly TDS return on non-salary payments.');

insert into public.checklist_template_items (firm_id, template_id, label, description, is_mandatory, sort_order) values
  -- GST Monthly (Deshmukh)
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000001',
   'Sales register', 'Tax-wise outward supplies for the month, Excel or Tally export.', true, 1),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000001',
   'Purchase register', 'Inward supplies with supplier GSTIN and invoice numbers.', true, 2),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000001',
   'Bank statements — all accounts', 'Full month, PDF from net banking.', true, 3),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000001',
   'Debit and credit notes', 'Only if any were issued during the month.', false, 4),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000001',
   'Export invoices and shipping bills', 'Only for exporters.', false, 5),

  -- ITR Individual (Deshmukh)
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000002',
   'Form 16 from employer', 'Parts A and B.', true, 1),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000002',
   'Form 26AS', 'Download from the income tax portal.', true, 2),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000002',
   'Annual Information Statement (AIS)', 'Download from the income tax portal.', true, 3),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000002',
   'Section 80C investment proofs', 'LIC, PPF, ELSS, tuition fees, principal repayment.', true, 4),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000002',
   'Home loan interest certificate', 'Only if claiming under Section 24.', false, 5),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000002',
   'Capital gains statement', 'Broker statement, only if shares or mutual funds were sold.', false, 6),

  -- Statutory Audit (Deshmukh)
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000003',
   'Trial balance as at 31 March', null, true, 1),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000003',
   'Tally backup for the full year', null, true, 2),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000003',
   'Bank confirmations', 'Balance confirmation letters from every bank.', true, 3),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000003',
   'Fixed asset register with additions', null, true, 4),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000003',
   'Board minutes for the year', null, true, 5),
  ('11111111-1111-4111-8111-111111111111', '71000001-0000-4000-8000-000000000003',
   'Related party transaction details', null, false, 6),

  -- GST Monthly (Iyer Venkatraman)
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000001',
   'Sales register', 'Outward supplies for the month.', true, 1),
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000001',
   'Purchase register', 'Inward supplies with supplier GSTIN.', true, 2),
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000001',
   'Bank statements', 'All operating accounts.', true, 3),
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000001',
   'E-way bill summary', null, false, 4),

  -- TDS Quarterly (Iyer Venkatraman)
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000002',
   'Contractor payment ledger', 'Party-wise payments for the quarter.', true, 1),
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000002',
   'TDS challans', 'All challans deposited for the quarter.', true, 2),
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000002',
   'PAN of every deductee', 'Missing PANs attract a higher rate.', true, 3),
  ('22222222-2222-4222-8222-222222222222', '72000002-0000-4000-8000-000000000002',
   'Lower deduction certificates', 'Section 197 certificates, if any.', false, 4);

-- -----------------------------------------------------------------------------
-- Requests, spread across the status vocabulary so the dashboard has something
-- real to show. Dates are relative to the seed run, so the demo never goes stale.
-- -----------------------------------------------------------------------------
insert into public.requests (
  id, firm_id, client_id, title, period_label, period_start, period_end,
  due_date, assigned_to, status, sent_at, created_by
) values
  -- Overdue: sent, still waiting, due date passed.
  ('81000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'c1000001-0000-4000-8000-000000000001', 'GSTR-1 & 3B — Aug 2026', 'Aug 2026',
   date '2026-08-01', date '2026-08-31', app.today_ist() - 4,
   'a0000001-0000-4000-8000-000000000003', 'awaiting_client',
   now() - interval '9 days', 'a0000001-0000-4000-8000-000000000002'),

  -- Waiting, not yet overdue.
  ('81000001-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'c1000001-0000-4000-8000-000000000002', 'GSTR-1 & 3B — Aug 2026', 'Aug 2026',
   date '2026-08-01', date '2026-08-31', app.today_ist() + 6,
   'a0000001-0000-4000-8000-000000000003', 'awaiting_client',
   now() - interval '3 days', 'a0000001-0000-4000-8000-000000000002'),

  -- Everything is in; a reviewer is looking at it.
  ('81000001-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'c1000001-0000-4000-8000-000000000003', 'GSTR-1 & 3B — Jul 2026', 'Jul 2026',
   date '2026-07-01', date '2026-07-31', app.today_ist() - 14,
   'a0000001-0000-4000-8000-000000000002', 'under_review',
   now() - interval '30 days', 'a0000001-0000-4000-8000-000000000002'),

  -- Draft, not yet sent to the client.
  ('81000001-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'c1000001-0000-4000-8000-000000000004', 'ITR — AY 2026-27', 'AY 2026-27',
   date '2025-04-01', date '2026-03-31', app.today_ist() + 25,
   'a0000001-0000-4000-8000-000000000002', 'requested',
   null, 'a0000001-0000-4000-8000-000000000001'),

  -- Done.
  ('81000001-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111',
   'c1000001-0000-4000-8000-000000000005', 'GSTR-1 & 3B — Jul 2026', 'Jul 2026',
   date '2026-07-01', date '2026-07-31', app.today_ist() - 20,
   'a0000001-0000-4000-8000-000000000003', 'completed',
   now() - interval '40 days', 'a0000001-0000-4000-8000-000000000002'),

  -- Firm B.
  ('82000002-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'c2000002-0000-4000-8000-000000000001', 'GSTR-1 & 3B — Aug 2026', 'Aug 2026',
   date '2026-08-01', date '2026-08-31', app.today_ist() - 2,
   'b0000002-0000-4000-8000-000000000002', 'awaiting_client',
   now() - interval '8 days', 'b0000002-0000-4000-8000-000000000001'),

  ('82000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'c2000002-0000-4000-8000-000000000004', 'Form 26Q — Q2 FY 2026-27', 'Q2 FY 2026-27',
   date '2026-07-01', date '2026-09-30', app.today_ist() + 18,
   'b0000002-0000-4000-8000-000000000002', 'requested',
   null, 'b0000002-0000-4000-8000-000000000001'),

  ('82000002-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'c2000002-0000-4000-8000-000000000002', 'GSTR-1 & 3B — Jul 2026', 'Jul 2026',
   date '2026-07-01', date '2026-07-31', app.today_ist() - 18,
   'b0000002-0000-4000-8000-000000000002', 'completed',
   now() - interval '38 days', 'b0000002-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- Request items, copied from the templates the way the app will copy them.
-- -----------------------------------------------------------------------------
insert into public.request_items (firm_id, request_id, label, description, is_mandatory, sort_order, status)
select
  r.firm_id,
  r.id,
  ti.label,
  ti.description,
  ti.is_mandatory,
  ti.sort_order,
  case
    when r.status = 'requested' then 'requested'::public.zq_status
    when r.status = 'completed' then 'completed'::public.zq_status
    when r.status = 'under_review' then 'under_review'::public.zq_status
    -- A partially answered request: the first two items are in, the rest are not.
    when ti.sort_order <= 2 then 'received'::public.zq_status
    else 'awaiting_client'::public.zq_status
  end
from public.requests r
join public.checklist_templates t
  on t.firm_id = r.firm_id
 and t.name = case
       when r.title like 'GSTR%' then 'GST Monthly — GSTR-1 & 3B'
       when r.title like 'ITR%'  then 'ITR — Individual (Salaried)'
       when r.title like 'Form 26Q%' then 'TDS Quarterly — Form 26Q'
     end
join public.checklist_template_items ti on ti.template_id = t.id;

-- -----------------------------------------------------------------------------
-- Portal tokens for the two requests currently with a client.
--
-- Only the hash is stored. The plaintext tokens, for local testing, are:
--   /p/demo-token-deshmukh-kirloskar-aug2026
--   /p/demo-token-iyer-vaigai-aug2026
-- -----------------------------------------------------------------------------
insert into public.portal_tokens (firm_id, request_id, token_hash, expires_at, created_by)
values
  ('11111111-1111-4111-8111-111111111111', '81000001-0000-4000-8000-000000000001',
   extensions.digest('demo-token-deshmukh-kirloskar-aug2026', 'sha256'),
   now() + interval '30 days', 'a0000001-0000-4000-8000-000000000002'),

  ('22222222-2222-4222-8222-222222222222', '82000002-0000-4000-8000-000000000001',
   extensions.digest('demo-token-iyer-vaigai-aug2026', 'sha256'),
   now() + interval '21 days', 'b0000002-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- A little history, so the activity timeline is not empty on first load.
-- -----------------------------------------------------------------------------
insert into public.activity_events (firm_id, actor_user_id, verb, target_type, target_id, metadata, created_at)
values
  ('11111111-1111-4111-8111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'request.created', 'request', '81000001-0000-4000-8000-000000000001',
   '{"title":"GSTR-1 & 3B — Aug 2026"}'::jsonb, now() - interval '9 days'),
  ('11111111-1111-4111-8111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'request.sent', 'request', '81000001-0000-4000-8000-000000000001',
   '{"channel":"email"}'::jsonb, now() - interval '9 days'),
  ('22222222-2222-4222-8222-222222222222', 'b0000002-0000-4000-8000-000000000001',
   'request.created', 'request', '82000002-0000-4000-8000-000000000001',
   '{"title":"GSTR-1 & 3B — Aug 2026"}'::jsonb, now() - interval '8 days');
