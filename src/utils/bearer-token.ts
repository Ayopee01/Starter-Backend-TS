// Import Utils
import ApiError from "./api-error";

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึง Bearer token จาก Authorization header
export function extractBearerToken(authorization: string | undefined): string {
  if (!authorization) {
    throw new ApiError(401, "INVALID_TOKEN", "Authorization token is required.");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid authorization format.");
  }

  return token;
}
