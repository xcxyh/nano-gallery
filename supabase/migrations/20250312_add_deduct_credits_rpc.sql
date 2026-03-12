-- Create atomic credit deduction RPC function
-- This prevents race conditions when multiple concurrent requests try to deduct credits

CREATE OR REPLACE FUNCTION deduct_credits(
  user_id UUID,
  amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
BEGIN
  -- Get current credits with row lock (FOR UPDATE)
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;

  -- Check if user exists
  IF current_credits IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'remainingCredits', 0,
      'error', 'User not found'
    );
  END IF;

  -- Check if credits are sufficient
  IF current_credits < amount THEN
    RETURN json_build_object(
      'success', false,
      'remainingCredits', current_credits,
      'error', 'Insufficient credits'
    );
  END IF;

  -- Atomically deduct credits
  UPDATE profiles
  SET credits = credits - amount
  WHERE id = user_id
  RETURNING credits INTO new_credits;

  RETURN json_build_object(
    'success', true,
    'remainingCredits', new_credits
  );
END;
$$;

-- Grant execution permission to service_role
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION deduct_credits(UUID, INTEGER) IS
'Atomically deducts credits from a user profile. Returns JSON with success status and remaining credits. Prevents race conditions in concurrent requests.';