import { NextResponse } from "next/server";

/**
 * Standardized API error and success response helpers.
 * Ensures consistent response shapes across all API routes.
 */

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized error response.
 *
 * @param status - HTTP status code
 * @param code - Machine-readable error code
 * @param message - Human-readable error message
 * @returns NextResponse with standardized error shape
 */
export function apiError(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

/**
 * Create a standardized success response.
 *
 * @param data - Response data payload
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success shape
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status },
  );
}

