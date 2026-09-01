import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PONG_HTML, PingController } from "./ping.controller";

describe("PingController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /ping returns pong as HTML", async () => {
    const res = await request(app.getHttpServer()).get("/ping").expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toBe(PONG_HTML);
  });
});
