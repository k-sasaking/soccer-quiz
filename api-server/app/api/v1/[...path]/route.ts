// /api/v1 の下で、どの API にも当たらない URL は共通フォーマットの 404 を返す
import { ApiError } from "@/lib/errors";
import { withApi } from "@/lib/http";

const notFound = withApi(() => {
  throw new ApiError(404, "NOT_FOUND", "指定された URL は存在しません。");
});

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
