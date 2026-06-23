import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { Principal } from "./current-user.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<Request & { principal?: Principal }>();
    const userId = this.resolveUserId(request);
    if (!userId) {
      throw new UnauthorizedException("Missing identity: provide X-User-Id or a Bearer token");
    }
    request.principal = { userId };
    return true;
  }

  private resolveUserId(request: Request): string | null {
    const headerUserId = request.header("x-user-id");
    if (headerUserId && headerUserId.trim().length > 0) {
      return headerUserId.trim();
    }
    const authorization = request.header("authorization");
    if (authorization?.startsWith("Bearer ")) {
      return this.auth.decodeToken(authorization.slice("Bearer ".length)).userId;
    }
    return null;
  }
}
