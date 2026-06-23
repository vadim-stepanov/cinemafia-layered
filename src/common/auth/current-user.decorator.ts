import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface Principal {
  userId: string;
}

/** Resolves the authenticated user id attached by AuthGuard. */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ principal?: Principal }>();
  if (!request.principal) {
    throw new Error("CurrentUserId used on a route without AuthGuard");
  }
  return request.principal.userId;
});
