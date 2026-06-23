import { Injectable, UnauthorizedException } from "@nestjs/common";

/**
 * Demo-boundary: emulated identity provider. There is no real auth — a "token" is
 * a base64url JSON envelope `{ sub }`. Swappable for a real adapter; identity is
 * not the subject of this portfolio (shown in the prior series project).
 */
@Injectable()
export class AuthService {
  issueToken(userId: string): string {
    return Buffer.from(JSON.stringify({ sub: userId }), "utf8").toString("base64url");
  }

  decodeToken(token: string): { userId: string } {
    try {
      const json = Buffer.from(token, "base64url").toString("utf8");
      const payload = JSON.parse(json) as { sub?: unknown };
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new Error("missing sub");
      }
      return { userId: payload.sub };
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
