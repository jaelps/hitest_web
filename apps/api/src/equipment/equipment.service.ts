import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEquipmentDto, UpdateEquipmentDto } from "./equipment.dto";

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, networkId: string) {
    await this.assertMembership(userId, networkId);
    return this.prisma.equipment.findMany({
      where: { networkId },
      orderBy: { name: "asc" }
    });
  }

  async create(userId: string, networkId: string, dto: CreateEquipmentDto) {
    await this.assertMembership(userId, networkId);
    return this.prisma.equipment.create({ data: { ...dto, port: dto.port ?? 80, networkId } });
  }

  async update(userId: string, equipmentId: string, dto: UpdateEquipmentDto) {
    await this.findAuthorizedEquipment(userId, equipmentId);
    return this.prisma.equipment.update({ where: { id: equipmentId }, data: dto });
  }

  async remove(userId: string, equipmentId: string) {
    await this.findAuthorizedEquipment(userId, equipmentId);
    await this.prisma.equipment.delete({ where: { id: equipmentId } });
    return { deleted: true };
  }

  async findAuthorizedEquipment(userId: string, equipmentId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException("Equipamento não encontrado.");
    await this.assertMembership(userId, equipment.networkId);
    return equipment;
  }

  async assertMembership(userId: string, networkId: string) {
    if (!networkId) throw new BadRequestException("Informe uma rede válida.");
    const membership = await this.prisma.networkMembership.findUnique({
      where: { userId_networkId: { userId, networkId } }
    });
    if (!membership) throw new ForbiddenException("Você não tem acesso a esta rede.");
    return membership;
  }
}
