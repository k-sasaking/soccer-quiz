// 6. PUT /api/v1/play-sessions/{playSessionId}/questions/{orderNo}/answer … 回答を登録する
// 7. GET /api/v1/play-sessions/{playSessionId}/questions/{orderNo}/answer … 登録済みの回答を取得
// どちらもログインが必要。自分の挑戦だけ
import { requireAuthUser } from "@/lib/auth";
import { json, methodNotAllowed, parseOrderNo, parsePlaySessionId, readJsonObject, requireInteger, withApi } from "@/lib/http";
import { getAnswer, putAnswer } from "@/lib/quiz-service";

type Context = { params: Promise<{ playSessionId: string; orderNo: string }> };

export const GET = withApi(async (request: Request, { params }: Context) => {
  const user = await requireAuthUser(request);
  const { playSessionId, orderNo } = await params;
  const id = parsePlaySessionId(playSessionId);
  return json(await getAnswer(user.id, id, parseOrderNo(orderNo)));
});

export const PUT = withApi(async (request: Request, { params }: Context) => {
  const user = await requireAuthUser(request);
  const { playSessionId, orderNo } = await params;
  const id = parsePlaySessionId(playSessionId);
  const no = parseOrderNo(orderNo);
  const body = await readJsonObject(request);
  const { created, answer } = await putAnswer(user.id, id, no, requireInteger(body, "choiceNo"));
  return created
    ? json(answer, 201, { Location: `/api/v1/play-sessions/${id}/questions/${no}/answer` })
    : json(answer, 200);
});

const notAllowed = methodNotAllowed(["GET", "PUT"]);
export const POST = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
