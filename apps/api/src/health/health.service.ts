import { Injectable } from "@nestjs/common";
import type { HealthStatus } from "@portfolio/shared";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthStatus> {
    let status: HealthStatus["status"] = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      status = "degraded";
    }

    return {
      status,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
