import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEquipmentDto, UpdateEquipmentDto } from "./equipment.dto";
import { EquipmentService } from "./equipment.service";

@Controller("equipments")
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private readonly equipment: EquipmentService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query("networkId") networkId: string) {
    return this.equipment.list(request.user.sub, networkId);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Query("networkId") networkId: string,
    @Body() dto: CreateEquipmentDto
  ) {
    return this.equipment.create(request.user.sub, networkId, dto);
  }

  @Put(":id")
  update(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipment.update(request.user.sub, id, dto);
  }

  @Delete(":id")
  remove(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.equipment.remove(request.user.sub, id);
  }

  @Post(":id/connectivity")
  checkConnectivity(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.equipment.checkConnectivity(request.user.sub, id);
  }
}
