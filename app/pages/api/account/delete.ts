import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type DeleteResponse = { ok: true };
type ErrorResponse = { error: { code: string; message: string } };
const RECENT_TOKEN_MAX_AGE_SECONDS = 5 * 60;

function getJwtIssuedAt(token: string): number | null {
  const [, payload] = token.split(".");
  if (payload == null) {
    return null;
  }

  try {
    const decodedPayload = Buffer.from(payload, "base64url").toString("utf-8");
    const parsedPayload = JSON.parse(decodedPayload) as { iat?: unknown };

    if (typeof parsedPayload.iat !== "number" || !Number.isFinite(parsedPayload.iat)) {
      return null;
    }

    return parsedPayload.iat;
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "POST のみ許可されています" } });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "unauthorized", message: "Bearer token が必要です" } });
  }
  const token = authHeader.slice(7);

  const issuedAt = getJwtIssuedAt(token);
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (issuedAt == null || nowInSeconds - issuedAt > RECENT_TOKEN_MAX_AGE_SECONDS) {
    return res.status(401).json({
      error: {
        code: "reauth_required",
        message: "5分以内に再認証したトークンが必要です",
      },
    });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: { code: "server_error", message: "Supabase が設定されていません" } });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError != null || user == null) {
    return res.status(401).json({ error: { code: "unauthorized", message: "トークンが無効です" } });
  }

  const uid = user.id;
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // Delete user's exams — child tables cascade via ON DELETE CASCADE
  const { error: deleteDataError } = await adminClient
    .from("exams")
    .delete()
    .eq("user_id", uid);

  if (deleteDataError != null) {
    return res.status(500).json({ error: { code: "delete_error", message: deleteDataError.message } });
  }

  // Delete auth.users after all data is removed
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(uid);
  if (deleteAuthError != null) {
    return res.status(500).json({ error: { code: "auth_delete_error", message: deleteAuthError.message } });
  }

  return res.status(200).json({ ok: true });
}
