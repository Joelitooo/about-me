import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  it("returns health status from the service", async () => {
    const mockHealth = { status: "ok" as const, uptimeSeconds: 42 };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { getHealth: vi.fn().mockResolvedValue(mockHealth) },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    await expect(controller.getHealth()).resolves.toEqual(mockHealth);
  });
});
