// 5. GET /api/v1/play-sessions/{playSessionId}/questions/{orderNo} … n 問目を取得（正解・解説なし）
// ログインが必要。自分の挑戦だけ
import { requireAuthUser } from "@/lib/auth";
import { json, methodNotAllowed, parseOrderNo, parsePlaySessionId, withApi } from "@/lib/http";
import { getSessionQuestion } from "@/lib/quiz-service";

type Context = { params: Promise<{ playSessionId: string; orderNo: string }> };

export const GET = withApi(async (request: Request, { params }: Context) => {
  const user = await requireAuthUser(request);
  const { playSessionId, orderNo } = await params;
  const id = parsePlaySessionId(playSessionId);
  return json(await getSessionQuestion(user.id, id, parseOrderNo(orderNo)));
});

const notAllowed = methodNotAllowed(["GET"]);
export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
