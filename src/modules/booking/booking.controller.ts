import { Body, Controller, Get, HttpCode, Param, Post, SerializeOptions } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { BookingService } from "./booking.service";
import { BookingResponseDto, BookingSummaryResponseDto } from "./dto/booking.dto";
import { HoldBookingDto } from "./dto/hold-booking.dto";

@ApiTags("booking")
@ApiBearerAuth()
@ApiSecurity("X-User-Id")
@Controller("bookings")
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Post("hold")
  @SerializeOptions({ type: BookingResponseDto, excludeExtraneousValues: true })
  @ApiCreatedResponse({ type: BookingResponseDto })
  hold(@CurrentUserId() userId: string, @Body() dto: HoldBookingDto): Promise<BookingResponseDto> {
    return this.booking.hold(userId, dto);
  }

  @Post(":id/confirm")
  @HttpCode(200)
  @SerializeOptions({ type: BookingResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: BookingResponseDto })
  confirm(@CurrentUserId() userId: string, @Param("id") id: string): Promise<BookingResponseDto> {
    return this.booking.confirm(userId, id);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @SerializeOptions({ type: BookingResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: BookingResponseDto })
  cancel(@CurrentUserId() userId: string, @Param("id") id: string): Promise<BookingResponseDto> {
    return this.booking.cancel(userId, id);
  }

  @Get()
  @SerializeOptions({ type: BookingSummaryResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: BookingSummaryResponseDto, isArray: true })
  list(@CurrentUserId() userId: string): Promise<BookingSummaryResponseDto[]> {
    return this.booking.listForUser(userId);
  }

  @Get(":id")
  @SerializeOptions({ type: BookingResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: BookingResponseDto })
  get(@CurrentUserId() userId: string, @Param("id") id: string): Promise<BookingResponseDto> {
    return this.booking.getForUser(userId, id);
  }
}
