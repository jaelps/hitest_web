import { BadRequestException } from "@nestjs/common";
import { EquipmentType } from "@prisma/client";
import { createServer, type Server } from "node:http";
import { CommandsService } from "./commands.service";

describe("CommandsService", () => {
  const prisma = {
    commandLog: { create: jest.fn() }
  };
  const equipment = {
    findAuthorizedEquipment: jest.fn()
  };
  let service: CommandsService;
  let server: Server | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommandsService(prisma as never, equipment as never);
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
      server = undefined;
    }
  });

  it("rejects actions that do not match the equipment type", async () => {
    equipment.findAuthorizedEquipment.mockResolvedValue({ type: EquipmentType.DOSER });
    await expect(service.execute("user", "doser", "AIR_SENSOR_REQUEST")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.commandLog.create).not.toHaveBeenCalled();
  });

  it("sends GET to the predefined sensor path and records the request", async () => {
    let method = "";
    let path = "";
    server = createServer((request, response) => {
      method = request.method ?? "";
      path = request.url ?? "";
      response.writeHead(204).end();
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Could not start test server.");
    equipment.findAuthorizedEquipment.mockResolvedValue({
      id: "sensor",
      type: EquipmentType.AIR_SENSOR,
      ip: "127.0.0.1",
      port: address.port
    });
    prisma.commandLog.create.mockResolvedValue({ path: "/airon1", success: true });

    const result = await service.execute("user", "sensor", "AIR_SENSOR_REQUEST");

    expect(method).toBe("GET");
    expect(path).toBe("/airon1");
    expect(prisma.commandLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "AIR_SENSOR_REQUEST", path: "/airon1", success: true })
    }));
    expect(result).toEqual({ path: "/airon1", success: true });
  });

  it("sends the machine module to its predefined path", async () => {
    let path = "";
    server = createServer((request, response) => {
      path = request.url ?? "";
      response.writeHead(200).end();
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Could not start test server.");
    equipment.findAuthorizedEquipment.mockResolvedValue({
      id: "module",
      type: EquipmentType.MACHINE_MODULE,
      ip: "127.0.0.1",
      port: address.port
    });
    prisma.commandLog.create.mockResolvedValue({ path: "/lb", success: true });

    await service.execute("user", "module", "MACHINE_MODULE_REQUEST");

    expect(path).toBe("/lb");
  });
});
