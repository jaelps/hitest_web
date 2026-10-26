import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CommandsService } from "./commands.service";
import { CreateCommandDto } from "./commands.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Get("commands")
  list(@Req() request: AuthenticatedRequest, @Query("networkId") networkId: string) {
    return this.commands.list(request.user.sub, networkId);
  }

  @Post("equipments/:id/commands")
  execute(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateCommandDto
  ) {
    return this.commands.execute(request.user.sub, id, dto.action);
  }
}

