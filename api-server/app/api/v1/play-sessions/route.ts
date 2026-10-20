// 2. POST /api/v1/play-sessions … 挑戦を開始する（ログインが必要）
import { requireAuthUser } from "@/lib/auth";
import { json, methodNotAllowed, readJsonObject, requireInteger, withApi } from "@/lib/http";
import { createPlaySession } from "@/lib/quiz-service";

export const POST = withApi(
  async (request: Request) => {
    const user = await requireAuthUser(request);
    const body = await readJsonObject(request);
    const session = await createPlaySession(user.id, requireInteger(body, "choiceCount"));
    return json(session, 201, { Location: `/api/v1/play-sessions/${session.id}` });
  },
  { rateLimitGroup: "createPlaySession" },
);

const notAllowed = methodNotAllowed(["POST"]);
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
