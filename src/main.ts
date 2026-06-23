import "./load-env";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { AppConfigService } from "./common/config/config.service";

function setupSwagger(app: Parameters<typeof configureApp>[0]): void {
  const config = new DocumentBuilder()
    .setTitle("Cinemafia API")
    .setDescription("Cinemafia — Layered (N-tier). Canonical REST contract for the series.")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", description: "Emulated auth token." })
    .addApiKey({ type: "apiKey", name: "X-User-Id", in: "header" }, "X-User-Id")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);
  setupSwagger(app);

  const config = app.get(AppConfigService);
  await app.listen(config.port);
  Logger.log(`Cinemafia API listening on http://localhost:${config.port}`, "Bootstrap");
}

void bootstrap();
