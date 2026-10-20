// 3. GET   /api/v1/play-sessions/{playSessionId} … 挑戦の状態を取得
// 4. PATCH /api/v1/play-sessions/{playSessionId} … 挑戦を終了する
// どちらもログインが必要。自分の挑戦だけ操作できる
import { requireAuthUser } from "@/lib/auth";
import { invalidRequest } from "@/lib/errors";
import { json, methodNotAllowed, parsePlaySessionId, readJsonObject, rejectUnknownFields, withApi } from "@/lib/http";
import { finishPlaySession, getPlaySession } from "@/lib/quiz-service";

type Context = { params: Promise<{ playSessionId: string }> };

export const GET = withApi(async (request: Request, { params }: Context) => {
  const user = await requireAuthUser(request);
  const { playSessionId } = await params;
  return json(await getPlaySession(user.id, parsePlaySessionId(playSessionId)));
});

export const PATCH = withApi(async (request: Request, { params }: Context) => {
  const user = await requireAuthUser(request);
  const { playSessionId } = await params;
  const id = parsePlaySessionId(playSessionId);
  const body = await readJsonObject(request);
  rejectUnknownFields(body, ["status"]);
  if (body.status === undefined) throw invalidRequest([{ field: "status", reason: "必須項目です。" }]);
  if (typeof body.status !== "string") {
    throw invalidRequest([{ field: "status", reason: "文字列で指定してください。" }]);
  }
  return json(await finishPlaySession(user.id, id, body.status));
});

const notAllowed = methodNotAllowed(["GET", "PATCH"]);
export const POST = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
