// 8. GET /api/v1/play-sessions/{playSessionId}/result … 結果と振り返りを取得（ログインが必要。自分の挑戦だけ）
import { requireAuthUser } from "@/lib/auth";
import { json, methodNotAllowed, parsePlaySessionId, withApi } from "@/lib/http";
import { getResult } from "@/lib/quiz-service";

type Context = { params: Promise<{ playSessionId: string }> };

export const GET = withApi(async (request: Request, { params }: Context) => {
  const user = await requireAuthUser(request);
  const { playSessionId } = await params;
  return json(await getResult(user.id, parsePlaySessionId(playSessionId)));
});

const notAllowed = methodNotAllowed(["GET"]);
export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
