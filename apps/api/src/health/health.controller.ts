import { Controller, Get } from "@nestjs/common";
import type { HealthStatus } from "@portfolio/shared";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }
}
