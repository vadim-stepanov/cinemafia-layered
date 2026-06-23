import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SUPPORT_TICKET_CREATED, SupportTicketCreatedEvent } from "../../common/events/support.events";
import { SupportRepository } from "./support.repository";
import { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import { SupportTicketResponseDto } from "./dto/support-ticket.dto";

@Injectable()
export class SupportService {
  constructor(
    private readonly repo: SupportRepository,
    private readonly events: EventEmitter2,
  ) {}

  async createTicket(userId: string, dto: CreateSupportTicketDto): Promise<SupportTicketResponseDto> {
    const memberId = await this.repo.findMemberIdByUserId(userId);
    const ticket = await this.repo.create(memberId, dto.subject, dto.body);

    this.events.emit(SUPPORT_TICKET_CREATED, {
      ticketId: ticket.id,
      userId,
      subject: ticket.subject,
    } satisfies SupportTicketCreatedEvent);

    return ticket;
  }
}
