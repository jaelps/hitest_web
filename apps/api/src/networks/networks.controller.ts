import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("networks")
@UseGuards(JwtAuthGuard)
export class NetworksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  listMyNetworks(@Req() request: AuthenticatedRequest) {
    return this.prisma.network.findMany({
      where: { memberships: { some: { userId: request.user.sub } } },
      select: { id: true, name: true }
    });
  }
}

