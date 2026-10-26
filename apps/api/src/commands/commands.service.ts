import { EquipmentType } from "@prisma/client";
import { BadRequestException, Injectable } from "@nestjs/common";
import * as http from "node:http";
import { EquipmentService } from "../equipment/equipment.service";
import { PrismaService } from "../prisma/prisma.service";
import { CommandAction } from "./commands.dto";

const COMMANDS: Record<CommandAction, { type: EquipmentType; path: string }> = {
  AIR_SENSOR_REQUEST: { type: EquipmentType.AIR_SENSOR, path: "/airon1" },
  MACHINE_MODULE_REQUEST: { type: EquipmentType.MACHINE_MODULE, path: "/lb" }
};

@Injectable()
export class CommandsService {
  constructor(private readonly prisma: PrismaService, private readonly equipment: EquipmentService) {}

  async list(userId: string, networkId: string) {
    await this.equipment.assertMembership(userId, networkId);
    return this.prisma.commandLog.findMany({
      where: { equipment: { networkId } },
      include: {
        equipment: { select: { id: true, name: true, type: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async execute(userId: string, equipmentId: string, action: CommandAction) {
    const device = await this.equipment.findAuthorizedEquipment(userId, equipmentId);
    const command = COMMANDS[action];
    if (!command || device.type !== command.type) {
      throw new BadRequestException("A ação não é permitida para este tipo de equipamento.");
    }

    const startedAt = Date.now();
    let statusCode: number | undefined;
    let errorMessage: string | undefined;
    let success = false;
    try {
      statusCode = await this.request(device.ip, device.port, command.path);
      success = statusCode >= 200 && statusCode < 300;
      if (!success) errorMessage = `O equipamento respondeu com HTTP ${statusCode}.`;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Falha de comunicação com o equipamento.";
    }

    const history = await this.prisma.commandLog.create({
      data: {
        equipmentId,
        userId,
        action,
        path: command.path,
        success,
        statusCode,
        durationMs: Date.now() - startedAt,
        errorMessage
      }
    });
    return history;
  }

  private request(ip: string, port: number, path: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = http.get({ hostname: ip, port, path, timeout: 5000 }, (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode ?? 0));
        response.on("error", reject);
      });
      request.on("timeout", () => request.destroy(new Error("Tempo limite de conexão excedido (5 s).")));
      request.on("error", reject);
    });
  }
}

