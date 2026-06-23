import { Module } from "@nestjs/common";
import { ClubNotesController } from "./club-notes.controller";
import { ClubNotesRepository } from "./club-notes.repository";
import { ClubNotesService } from "./club-notes.service";

@Module({
  controllers: [ClubNotesController],
  providers: [ClubNotesService, ClubNotesRepository],
})
export class ClubNotesModule {}
