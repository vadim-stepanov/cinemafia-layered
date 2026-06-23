import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller";
import { SupportRepository } from "./support.repository";
import { SupportService } from "./support.service";

@Module({
  controllers: [SupportController],
  providers: [SupportService, SupportRepository],
})
export class SupportModule {}
