import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug"],
  });

  const config = app.get(ConfigService);
  const port = Number(config.get("PORT", 3000));
  const corsOrigin = config.get<string>("CORS_ORIGIN", "http://localhost:5173");

  app.use(helmet());
  app.enableCors({
    origin: corsOrigin.split(",").map((value) => value.trim()),
    methods: ["GET", "POST", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
