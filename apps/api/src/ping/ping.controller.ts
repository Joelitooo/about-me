import { Controller, Get, Header } from "@nestjs/common";

export const PONG_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>pong</title>
  </head>
  <body>pong</body>
</html>
`;

@Controller("ping")
export class PingController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getPong(): string {
    return PONG_HTML;
  }
}
