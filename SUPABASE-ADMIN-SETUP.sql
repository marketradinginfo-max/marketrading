-- =========================================================
-- MARKETRADING FINAL ADMIN / TRANSACTION SETUP
-- Run this in Supabase SQL Editor AFTER BACKING UP YOUR DATA.
-- This is for a virtual/demo trading platform.
-- =========================================================

-- 1) Make sure transaction columns used by the app exist.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_after numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 2) Normalize empty statuses.
UPDATE public.transactions SET status='pending' WHERE status IS NULL OR trim(status)='';

-- 3) Helpful indexes.
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_type_status_idx ON public.transactions(type,status);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON public.transactions(created_at DESC);

-- 4) Keep profiles balance protected from direct client updates.
-- Users may update normal profile fields, but not balance/role.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (fullname, username, phone, country, account_type, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- 5) Transaction access: users can read their own transactions.
GRANT SELECT ON public.transactions TO authenticated;
GRANT INSERT ON public.transactions TO authenticated;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own transaction requests" ON public.transactions;
CREATE POLICY "Users can create own transaction requests"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND type IN ('deposit','withdrawal','investment'));

-- Admin helper.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND lower(coalesce(role,'')) = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- 6) Admin credit RPC.
CREATE OR REPLACE FUNCTION public.admin_credit(
    target_user_id uuid,
    credit_amount numeric,
    credit_description text DEFAULT 'Admin credit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
    old_balance numeric;
    new_balance numeric;
    tx_id uuid;
BEGIN
    SELECT lower(coalesce(role,'')) INTO caller_role
    FROM public.profiles WHERE id = auth.uid();

    IF caller_role <> 'admin' THEN
        RAISE EXCEPTION 'Access denied: administrator only';
    END IF;

    IF credit_amount IS NULL OR credit_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be greater than zero';
    END IF;

    SELECT balance INTO old_balance
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    new_balance := coalesce(old_balance,0) + credit_amount;

    UPDATE public.profiles
    SET balance = new_balance
    WHERE id = target_user_id;

    INSERT INTO public.transactions
        (user_id, amount, balance_after, description, type, status)
    VALUES
        (target_user_id, credit_amount, new_balance,
         coalesce(nullif(trim(credit_description),''),'Admin credit'),
         'admin_credit', 'approved')
    RETURNING id INTO tx_id;

    RETURN jsonb_build_object(
        'transaction_id', tx_id,
        'old_balance', old_balance,
        'new_balance', new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_credit(uuid,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_credit(uuid,numeric,text) TO authenticated;

-- 7) Admin request processing.
CREATE OR REPLACE FUNCTION public.admin_process_transaction(
    transaction_id uuid,
    decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
    tx record;
    old_balance numeric;
    new_balance numeric;
BEGIN
    SELECT lower(coalesce(role,'')) INTO caller_role
    FROM public.profiles WHERE id = auth.uid();

    IF caller_role <> 'admin' THEN
        RAISE EXCEPTION 'Access denied: administrator only';
    END IF;

    IF lower(decision) NOT IN ('approve','reject') THEN
        RAISE EXCEPTION 'Decision must be approve or reject';
    END IF;

    SELECT * INTO tx
    FROM public.transactions
    WHERE id = transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    IF tx.type NOT IN ('deposit','withdrawal','investment') THEN
        RAISE EXCEPTION 'This transaction type cannot be processed here';
    END IF;

    IF lower(coalesce(tx.status,'')) <> 'pending' THEN
        RAISE EXCEPTION 'This request has already been processed';
    END IF;

    IF lower(decision) = 'reject' THEN
        UPDATE public.transactions
        SET status = 'rejected'
        WHERE id = transaction_id;

        RETURN jsonb_build_object('transaction_id',transaction_id,'status','rejected');
    END IF;

    SELECT balance INTO old_balance
    FROM public.profiles
    WHERE id = tx.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    old_balance := coalesce(old_balance,0);

    IF tx.type = 'withdrawal' OR tx.type = 'investment' THEN
        IF old_balance < tx.amount THEN
            RAISE EXCEPTION 'User has insufficient balance';
        END IF;
        new_balance := old_balance - tx.amount;
    ELSE
        new_balance := old_balance + tx.amount;
    END IF;

    UPDATE public.profiles
    SET balance = new_balance
    WHERE id = tx.user_id;

    UPDATE public.transactions
    SET status = 'approved',
        balance_after = new_balance
    WHERE id = transaction_id;

    RETURN jsonb_build_object(
        'transaction_id',transaction_id,
        'status','approved',
        'balance_after',new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_transaction(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_transaction(uuid,text) TO authenticated;

-- 8) Make sure the admin account is actually marked admin.
-- Uncomment and replace the email only if needed:
-- UPDATE public.profiles SET role='admin' WHERE email='YOUR-ADMIN-EMAIL';

-- 9) Verify.
SELECT id,email,fullname,role,balance,created_at
FROM public.profiles
ORDER BY created_at DESC;

SELECT id,user_id,type,status,amount,balance_after,description,created_at
FROM public.transactions
ORDER BY created_at DESC
LIMIT 50;
