-- Kirjakerhon Atlas. All privileged entry points check the authenticated user.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.clubs (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
 owner_id uuid not null references auth.users(id), revision integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.club_access (
 club_id uuid not null references public.clubs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','member','reader')),
 primary key(club_id,user_id)
);
create index club_access_user on public.club_access(user_id);
create table public.members (
 id uuid not null, club_id uuid not null references public.clubs(id) on delete cascade,
 display_name text not null check(length(display_name)>0), color text not null default '#752f38',
 linked_user_id uuid references auth.users(id), created_at timestamptz not null default now(),
 primary key(club_id,id)
);
create table public.works (
 id uuid not null, club_id uuid not null references public.clubs(id) on delete cascade,
 title text not null check(length(title)>0), creator text not null default '',
 category text not null check(category in ('book','theatre','exhibition','other')),
 data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(club_id,id)
);
create table public.ratings (
 club_id uuid not null, work_id uuid not null, member_id uuid not null,
 value numeric not null, rating_min numeric not null, rating_max numeric not null,
 review text, source text, created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(club_id,work_id,member_id),
 foreign key(club_id,work_id) references public.works(club_id,id) on delete cascade,
 foreign key(club_id,member_id) references public.members(club_id,id) on delete cascade,
 check(rating_max>rating_min and value>=rating_min and value<=rating_max)
);
create table public.imports (
 id uuid not null, club_id uuid not null references public.clubs(id) on delete cascade,
 filename text not null, fingerprint text not null, data jsonb not null,
 created_at timestamptz not null default now(), primary key(club_id,id)
);
create table public.book_metadata (
 club_id uuid not null,work_id uuid not null,data jsonb not null,
 primary key(club_id,work_id),
 foreign key(club_id,work_id) references public.works(club_id,id) on delete cascade
);
create table private.invitations (
 token_hash text primary key, club_id uuid not null references public.clubs(id) on delete cascade,
 email text not null, role text not null check(role in ('member','reader')),
 expires_at timestamptz not null default now()+interval '7 days', used_at timestamptz,
 created_by uuid not null references auth.users(id)
);
alter table private.invitations enable row level security;

create function private.has_access(p_club uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.club_access where club_id=p_club and user_id=auth.uid());
$$;
create function private.is_admin(p_club uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.club_access where club_id=p_club and user_id=auth.uid() and role='admin');
$$;
revoke all on function private.has_access(uuid), private.is_admin(uuid) from public;
grant execute on function private.has_access(uuid), private.is_admin(uuid) to authenticated;

alter table public.clubs enable row level security;
alter table public.club_access enable row level security;
alter table public.members enable row level security;
alter table public.works enable row level security;
alter table public.ratings enable row level security;
alter table public.imports enable row level security;
alter table public.book_metadata enable row level security;
create policy club_read on public.clubs for select to authenticated using(private.has_access(id));
create policy access_read on public.club_access for select to authenticated using(user_id=(select auth.uid()));
create policy member_read on public.members for select to authenticated using(private.has_access(club_id));
create policy work_read on public.works for select to authenticated using(private.has_access(club_id));
create policy rating_read on public.ratings for select to authenticated using(private.has_access(club_id));
create policy import_read on public.imports for select to authenticated using(private.has_access(club_id));
create policy metadata_read on public.book_metadata for select to authenticated using(private.has_access(club_id));
revoke all on public.clubs,public.club_access,public.members,public.works,public.ratings,public.imports,public.book_metadata from anon,authenticated;
grant select on public.clubs,public.club_access,public.members,public.works,public.ratings,public.imports,public.book_metadata to authenticated;
-- All writes go through checked, atomic RPCs. No client can grant itself access.

create function private.create_club(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if length(trim(p_name)) not between 1 and 100 then raise exception 'invalid_name'; end if;
 insert into public.clubs(name,owner_id) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.club_access(club_id,user_id,role) values(v_id,auth.uid(),'admin');
 return v_id;
end; $$;
create function private.create_invitation(p_club_id uuid,p_email text,p_role text) returns text
language plpgsql security definer set search_path='' as $$
declare v_token text;
begin
 if not private.is_admin(p_club_id) then raise exception 'admin_required'; end if;
 if p_role not in ('member','reader') or p_email is null or position('@' in p_email)<2 then raise exception 'invalid_invitation'; end if;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into private.invitations(token_hash,club_id,email,role,created_by)
 values(encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_club_id,lower(trim(p_email)),p_role,auth.uid());
 return v_token;
end; $$;
create function private.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_inv private.invitations; v_email text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into v_inv from private.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or v_inv.used_at is not null or v_inv.expires_at<now() or v_inv.email is distinct from v_email then raise exception 'invalid_invitation'; end if;
 insert into public.club_access(club_id,user_id,role) values(v_inv.club_id,auth.uid(),v_inv.role) on conflict do nothing;
 update private.invitations set used_at=now() where token_hash=v_inv.token_hash;
 return v_inv.club_id;
end; $$;

create function private.save_archive(p_club_id uuid,p_expected_revision integer,p_archive jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare v_revision integer; m jsonb; w jsonb; r jsonb; i jsonb;
begin
 if not private.is_admin(p_club_id) then raise exception 'admin_required'; end if;
 select revision into v_revision from public.clubs where id=p_club_id for update;
 if v_revision is distinct from p_expected_revision then raise exception 'revision_conflict'; end if;
 if p_archive->>'version' is distinct from '1' or jsonb_typeof(p_archive->'members') is distinct from 'array' or jsonb_typeof(p_archive->'works') is distinct from 'array' or jsonb_typeof(p_archive->'imports') is distinct from 'array' then raise exception 'invalid_archive'; end if;
 -- Replace only inside this transaction. Any failed validation rolls back all changes.
 delete from public.ratings where club_id=p_club_id;
 delete from public.book_metadata where club_id=p_club_id;
 delete from public.works where club_id=p_club_id and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_archive->'works'));
 delete from public.members where club_id=p_club_id and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_archive->'members'));
 delete from public.imports where club_id=p_club_id;
 for m in select * from jsonb_array_elements(p_archive->'members') loop
  insert into public.members(id,club_id,display_name,color) values((m->>'id')::uuid,p_club_id,m->>'name',coalesce(m->>'color','#752f38')) on conflict(club_id,id) do update set display_name=excluded.display_name,color=excluded.color;
 end loop;
 for w in select * from jsonb_array_elements(p_archive->'works') loop
  insert into public.works(id,club_id,title,creator,category,data)
  values((w->>'id')::uuid,p_club_id,w->>'title',coalesce(w->>'creator',''),w->>'category',w-'ratings'-'metadata') on conflict(club_id,id) do update set title=excluded.title,creator=excluded.creator,category=excluded.category,data=excluded.data,updated_at=now();
  if jsonb_typeof(w->'ratings') is distinct from 'array' then raise exception 'invalid_ratings'; end if;
  for r in select * from jsonb_array_elements(w->'ratings') loop
   insert into public.ratings(club_id,work_id,member_id,value,rating_min,rating_max,review,source)
   values(p_club_id,(w->>'id')::uuid,(r->>'memberId')::uuid,(r->>'value')::numeric,(r->>'min')::numeric,(r->>'max')::numeric,r->>'review',r->>'source');
  end loop;
  if w->'metadata' is not null and w->'metadata'<>'null'::jsonb then
   insert into public.book_metadata(club_id,work_id,data) values(p_club_id,(w->>'id')::uuid,w->'metadata');
  end if;
 end loop;
 for i in select * from jsonb_array_elements(p_archive->'imports') loop
  insert into public.imports(id,club_id,filename,fingerprint,data,created_at)
  values((i->>'id')::uuid,p_club_id,i->>'filename',i->>'fingerprint',i,(i->>'at')::timestamptz);
 end loop;
 update public.clubs set revision=revision+1 where id=p_club_id returning revision into v_revision;
 return v_revision;
end; $$;
-- Only the wrappers below are exposed by PostgREST; privileged code stays private.
create function public.create_club(p_name text) returns uuid language sql security invoker set search_path='' as $$select private.create_club(p_name)$$;
create function public.create_invitation(p_club_id uuid,p_email text,p_role text) returns text language sql security invoker set search_path='' as $$select private.create_invitation(p_club_id,p_email,p_role)$$;
create function public.accept_invitation(p_token text) returns uuid language sql security invoker set search_path='' as $$select private.accept_invitation(p_token)$$;
create function public.save_archive(p_club_id uuid,p_expected_revision integer,p_archive jsonb) returns integer language sql security invoker set search_path='' as $$select private.save_archive(p_club_id,p_expected_revision,p_archive)$$;
revoke all on function private.create_club(text),private.create_invitation(uuid,text,text),private.accept_invitation(text),private.save_archive(uuid,integer,jsonb) from public;
revoke all on function public.create_club(text),public.create_invitation(uuid,text,text),public.accept_invitation(text),public.save_archive(uuid,integer,jsonb) from public;
grant execute on function private.create_club(text),private.create_invitation(uuid,text,text),private.accept_invitation(text),private.save_archive(uuid,integer,jsonb) to authenticated;
grant execute on function public.create_club(text),public.create_invitation(uuid,text,text),public.accept_invitation(text),public.save_archive(uuid,integer,jsonb) to authenticated;
-- Supabase Realtime emits a single revision update after each atomic write.
alter publication supabase_realtime add table public.clubs;
