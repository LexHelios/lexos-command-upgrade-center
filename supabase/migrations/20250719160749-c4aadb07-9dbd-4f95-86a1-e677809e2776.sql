-- Fix function search path security issues
ALTER FUNCTION public.cleanup_old_error_logs(integer) SET search_path = '';
ALTER FUNCTION public.get_current_user_id() SET search_path = '';
ALTER FUNCTION public.has_shadow_agent_access(uuid) SET search_path = '';