// 1. GET /api/v1/quiz … クイズ全体の情報（問題数・択数）
import { json, methodNotAllowed, withApi } from "@/lib/http";
import { getQuiz } from "@/lib/quiz-service";

export const GET = withApi(async () => json(await getQuiz()), { cacheControl: "public, max-age=60" });

const notAllowed = methodNotAllowed(["GET"]);
export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
