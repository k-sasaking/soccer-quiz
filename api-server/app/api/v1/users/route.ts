// 9. POST /api/v1/users … 利用者を登録する（ログイン不要）
import { invalidRequest } from "@/lib/errors";
import { json, methodNotAllowed, readJsonObject, rejectUnknownFields, withApi } from "@/lib/http";
import { createUser } from "@/lib/users";

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (value === undefined) throw invalidRequest([{ field, reason: "必須項目です。" }]);
  if (typeof value !== "string") throw invalidRequest([{ field, reason: "文字列で指定してください。" }]);
  return value;
}

export const POST = withApi(
  async (request: Request) => {
    const body = await readJsonObject(request);
    rejectUnknownFields(body, ["email", "password"]);
    return json(await createUser(requireString(body, "email"), requireString(body, "password")), 201);
  },
  { rateLimitGroup: "createUser" },
);

const notAllowed = methodNotAllowed(["POST"]);
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
