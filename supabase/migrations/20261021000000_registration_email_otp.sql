create table if not exists public.registration_email_otp_state (
  email_hash text primary key,
  code_hash text,
  salt text,
  attempts integer not null default 0,
  sent_at timestamptz,
  expires_at timestamptz,
  window_started_at timestamptz,
  send_count integer not null default 0,
  verified_until timestamptz,
  ticket_hash text,
  claimed_by text
);

create table if not exists public.registration_email_otp_ip_limits (
  ip_hash text primary key,
  window_started_at timestamptz,
  request_count integer not null default 0
);

alter table public.registration_email_otp_state enable row level security;
alter table public.registration_email_otp_ip_limits enable row level security;
revoke all on public.registration_email_otp_state, public.registration_email_otp_ip_limits from public, anon, authenticated, service_role;
grant select on public.registration_email_otp_state to service_role;

create or replace function public.request_registration_email_otp(
  p_email_hash text,
  p_ip_hash text,
  p_salt text,
  p_code_hash text
) returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_email public.registration_email_otp_state%rowtype;
  v_ip public.registration_email_otp_ip_limits%rowtype;
begin
  insert into public.registration_email_otp_state (email_hash) values (p_email_hash) on conflict do nothing;
  insert into public.registration_email_otp_ip_limits (ip_hash) values (p_ip_hash) on conflict do nothing;
  select * into v_email from public.registration_email_otp_state where email_hash = p_email_hash for update;
  select * into v_ip from public.registration_email_otp_ip_limits where ip_hash = p_ip_hash for update;

  if v_email.sent_at > v_now - interval '1 minute' then return 60; end if;
  if v_email.window_started_at > v_now - interval '1 hour' and v_email.send_count >= 5 then
    return greatest(1, ceil(extract(epoch from (v_email.window_started_at + interval '1 hour' - v_now)))::integer);
  end if;
  if v_ip.window_started_at > v_now - interval '1 hour' and v_ip.request_count >= 20 then
    return greatest(1, ceil(extract(epoch from (v_ip.window_started_at + interval '1 hour' - v_now)))::integer);
  end if;

  update public.registration_email_otp_state set
    code_hash = p_code_hash,
    salt = p_salt,
    attempts = 0,
    sent_at = v_now,
    expires_at = v_now + interval '10 minutes',
    window_started_at = case when v_email.window_started_at > v_now - interval '1 hour' then v_email.window_started_at else v_now end,
    send_count = case when v_email.window_started_at > v_now - interval '1 hour' then v_email.send_count + 1 else 1 end,
    verified_until = null,
    ticket_hash = null,
    claimed_by = null
  where email_hash = p_email_hash;

  update public.registration_email_otp_ip_limits set
    window_started_at = case when v_ip.window_started_at > v_now - interval '1 hour' then v_ip.window_started_at else v_now end,
    request_count = case when v_ip.window_started_at > v_now - interval '1 hour' then v_ip.request_count + 1 else 1 end
  where ip_hash = p_ip_hash;
  return 0;
end;
$$;

create or replace function public.verify_registration_email_otp(
  p_email_hash text,
  p_code_hash text,
  p_verified_until timestamptz,
  p_ticket_hash text
) returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_state public.registration_email_otp_state%rowtype;
begin
  select * into v_state from public.registration_email_otp_state where email_hash = p_email_hash for update;
  if not found or v_state.expires_at is null or v_state.expires_at <= v_now then return 'expired'; end if;
  if v_state.verified_until > v_now then return 'already_verified'; end if;
  if v_state.attempts >= 5 then return 'locked'; end if;
  if v_state.code_hash is distinct from p_code_hash then
    update public.registration_email_otp_state set attempts = v_state.attempts + 1 where email_hash = p_email_hash;
    return 'invalid';
  end if;
  if p_verified_until <= v_now or p_verified_until > v_now + interval '11 minutes' then return 'expired'; end if;

  update public.registration_email_otp_state set
    code_hash = null,
    salt = null,
    attempts = 0,
    verified_until = p_verified_until,
    expires_at = p_verified_until,
    ticket_hash = p_ticket_hash
  where email_hash = p_email_hash;
  return 'verified';
end;
$$;

create or replace function public.claim_registration_email_otp(p_email_hash text, p_uid text, p_ticket_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.registration_email_otp_state%rowtype;
begin
  select * into v_state from public.registration_email_otp_state where email_hash = p_email_hash for update;
  if not found or v_state.verified_until <= clock_timestamp() or v_state.ticket_hash is distinct from p_ticket_hash then return false; end if;
  if v_state.claimed_by is not null and v_state.claimed_by <> p_uid then return false; end if;
  update public.registration_email_otp_state set claimed_by = p_uid where email_hash = p_email_hash;
  return true;
end;
$$;

create or replace function public.consume_registration_email_otp(p_email_hash text, p_uid text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.registration_email_otp_state where email_hash = p_email_hash and claimed_by = p_uid;
  return found;
end;
$$;

create or replace function public.clear_registration_email_otp(p_email_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.registration_email_otp_state where email_hash = p_email_hash;
  return found;
end;
$$;

revoke all on function public.request_registration_email_otp(text, text, text, text) from public, anon, authenticated;
revoke all on function public.verify_registration_email_otp(text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.claim_registration_email_otp(text, text, text) from public, anon, authenticated;
revoke all on function public.consume_registration_email_otp(text, text) from public, anon, authenticated;
revoke all on function public.clear_registration_email_otp(text) from public, anon, authenticated;
grant execute on function public.request_registration_email_otp(text, text, text, text) to service_role;
grant execute on function public.verify_registration_email_otp(text, text, timestamptz, text) to service_role;
grant execute on function public.claim_registration_email_otp(text, text, text) to service_role;
grant execute on function public.consume_registration_email_otp(text, text) to service_role;
grant execute on function public.clear_registration_email_otp(text) to service_role;
