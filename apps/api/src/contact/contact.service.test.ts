import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { ContactService } from "./contact.service";

describe("ContactService", () => {
  it("persists a contact message", async () => {
    const create = vi.fn().mockResolvedValue({ id: "1" });
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: PrismaService,
          useValue: { contactMessage: { create } },
        },
      ],
    }).compile();

    const service = moduleRef.get(ContactService);
    await service.create({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
    });

    expect(create).toHaveBeenCalledWith({
      data: { name: "Ada", email: "ada@example.com", message: "Hello" },
    });
  });
});
