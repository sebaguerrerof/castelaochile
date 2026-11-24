-- Withdraw a published institutional page to real draft state, keeping blocks, redirects and any pending editorial draft.
create function public.withdraw_editorial_page(p_id uuid,p_base_updated_at timestamptz,p_draft_updated_at timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare current_version timestamptz; current_status public.content_status; draft_version timestamptz; new_version timestamptz;
begin
 if auth.uid() is null or not coalesce(private.is_editor_or_superadmin(),false) then raise insufficient_privilege; end if;
 select updated_at,status into current_version,current_status from public.cms_pages where id=p_id for update;
 if current_version is null then raise exception 'Resource not found'; end if;
 if current_version is distinct from p_base_updated_at then raise exception 'CMS_CONFLICT' using errcode='40001'; end if;
 select updated_at into draft_version from public.cms_editorial_drafts where kind='page' and resource_id=p_id::text for update;
 if draft_version is distinct from p_draft_updated_at then raise exception 'CMS_DRAFT_CONFLICT' using errcode='40001'; end if;
 if current_status<>'published' then raise exception 'Page is not published'; end if;
 update public.cms_pages set status='draft' where id=p_id returning updated_at into new_version;
 -- Keep a pending draft attached to the new page version; its own version token is unchanged.
 update public.cms_editorial_drafts set base_updated_at=new_version where kind='page' and resource_id=p_id::text;
 insert into public.admin_audit_log(actor_id,action,resource_type,resource_id,metadata)
 values(auth.uid(),'cms.withdrawn','page',p_id,jsonb_build_object('module','cms-editorial'));
 return p_id;
end; $$;
revoke all on function public.withdraw_editorial_page(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.withdraw_editorial_page(uuid,timestamptz,timestamptz) to authenticated;
