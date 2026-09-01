CREATE OR REPLACE FUNCTION consume_attempt(
    p_profile_id UUID,
    p_session_token_hash TEXT,
    p_game_version TEXT
) RETURNS JSON AS $$
DECLARE
    v_payment RECORD;
    v_session RECORD;
    v_attempt_number INT;
BEGIN
    -- 1. Idempotency check: if this exact session token was already used, just return its state
    SELECT gs.id, gs.attempt_number, p.id as payment_id, p.attempts_total, p.attempts_used, p.challenge_code
    INTO v_session
    FROM game_sessions gs
    JOIN payments p ON p.id = gs.payment_id
    WHERE gs.session_token_hash = p_session_token_hash
    AND gs.profile_id = p_profile_id;
    
    IF FOUND THEN
        RETURN json_build_object(
            'payment_id', v_session.payment_id,
            'attempt_number', v_session.attempt_number,
            'attempts_remaining', v_session.attempts_total - v_session.attempts_used,
            'challenge_code', v_session.challenge_code
        );
    END IF;

    -- 2. Lock the first available payment row for this user
    SELECT id, attempts_total, attempts_used, challenge_code
    INTO v_payment
    FROM payments
    WHERE profile_id = p_profile_id
      AND status = 'succeeded'
      AND attempts_used < attempts_total
    ORDER BY created_at ASC
    LIMIT 1
    FOR NO KEY UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No attempts remaining';
    END IF;

    -- 3. Consume attempt atomically
    v_attempt_number := v_payment.attempts_used + 1;
    
    UPDATE payments
    SET attempts_used = v_attempt_number,
        updated_at = NOW()
    WHERE id = v_payment.id;

    -- 4. Create the game session within the same transaction
    INSERT INTO game_sessions (
        profile_id,
        payment_id,
        attempt_number,
        session_token_hash,
        game_version,
        status
    ) VALUES (
        p_profile_id,
        v_payment.id,
        v_attempt_number,
        p_session_token_hash,
        p_game_version,
        'active'
    );

    RETURN json_build_object(
        'payment_id', v_payment.id,
        'attempt_number', v_attempt_number,
        'attempts_remaining', v_payment.attempts_total - v_attempt_number,
        'challenge_code', v_payment.challenge_code
    );
END;
$$ LANGUAGE plpgsql;
