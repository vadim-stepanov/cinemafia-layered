import { Controller, Get, SerializeOptions } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { MembersService } from "./members.service";
import { MeResponseDto } from "./dto/me.dto";

@ApiTags("members")
@ApiBearerAuth()
@ApiSecurity("X-User-Id")
@SerializeOptions({ type: MeResponseDto, excludeExtraneousValues: true })
@Controller("me")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @ApiOkResponse({ type: MeResponseDto })
  @ApiNotFoundResponse({ description: "No member profile for the authenticated user." })
  getMe(@CurrentUserId() userId: string): Promise<MeResponseDto> {
    return this.members.getMe(userId);
  }
}
