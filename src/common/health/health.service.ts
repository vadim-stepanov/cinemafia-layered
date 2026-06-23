import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "up" | "down";
  uptime: number;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const database = await this.pingDatabase();
    return {
      status: database === "up" ? "ok" : "degraded",
      database,
      uptime: Math.floor(process.uptime()),
    };
  }

  private async pingDatabase(): Promise<"up" | "down"> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "up";
    } catch {
      return "down";
    }
  }
}
