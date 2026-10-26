import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createConnection } from "node:net";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEquipmentDto, UpdateEquipmentDto } from "./equipment.dto";

const CONNECTIVITY_TIMEOUT_MS = 3000;

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

  async checkConnectivity(userId: string, equipmentId: string) {
    const equipment = await this.findAuthorizedEquipment(userId, equipmentId);
    const startedAt = Date.now();
    const online = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host: equipment.ip, port: equipment.port });
      let settled = false;
      const finish = (connected: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(connected);
      };

      socket.setTimeout(CONNECTIVITY_TIMEOUT_MS);
      socket.once("connect", () => finish(true));
      socket.once("timeout", () => finish(false));
      socket.once("error", () => finish(false));
    });

    return {
      online,
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      message: online ? "Conexão TCP estabelecida." : "Sem resposta na porta cadastrada."
    };
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
