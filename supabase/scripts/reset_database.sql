-- ⚠ TEST PROJECTS ONLY — DESTRUCTIVE.
-- Deletes every login account and every HighGrade table/function, so you can
-- run supabase/migrations/0001_schema.sql again on a clean database.
-- Never run this on a project with real families.

drop trigger if exists on_auth_user_created on auth.users;
delete from auth.users;

drop table if exists
  public.ai_usage, public.drafts, public.works, public.children, public.parents,
  public.profiles, public.admins, public.free_tries
  cascade;

drop function if exists
  public.handle_new_user(), public.handle_new_parent(), public.trim_old_drafts(),
  public.is_admin(), public.admin_list_users(), public.admin_list_families(),
  public.complete_parent_signup(text, int, boolean),
  public.session_is_fresh(), public.parent_pin_status(), public.check_parent_pin(text),
  public.verify_parent_pin(text), public.set_parent_pin(text, text),
  public.add_child(text, text, int, int), public.update_child(text, uuid, text, int),
  public.delete_child(text, uuid), public.owns_child(uuid),
  public.update_child(text, uuid, text, int, text), public.advance_child_level(uuid),
  public.set_child_avatar(uuid, text, text), public.set_child_voice_typing(text, uuid, boolean),
  public.set_stripe_customer(text), public.draft_overall(jsonb), public.admin_child_progress(uuid),
  public.delete_my_account(text), public.my_email_hash(), public.free_tries_status(),
  public.record_free_try(numeric), public.free_tries_left(int, numeric), public.admin_free_tries()
  cascade;
