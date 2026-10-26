import { ForbiddenException } from "@nestjs/common";
import { createServer, type Server } from "node:http";
import { EquipmentService } from "./equipment.service";

describe("EquipmentService connectivity checks", () => {
  const prisma = {
    equipment: { findUnique: jest.fn() },
    networkMembership: { findUnique: jest.fn() }
  };
  let service: EquipmentService;
  let server: Server | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EquipmentService(prisma as never);
    prisma.equipment.findUnique.mockResolvedValue({
      id: "device",
      ip: "127.0.0.1",
      port: 0,
      networkId: "network"
    });
    prisma.networkMembership.findUnique.mockResolvedValue({ userId: "user", networkId: "network" });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
      server = undefined;
    }
  });

  it("reports online when the registered equipment accepts a TCP connection", async () => {
    server = createServer();
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Could not start test server.");
    prisma.equipment.findUnique.mockResolvedValue({
      id: "device",
      ip: "127.0.0.1",
      port: address.port,
      networkId: "network"
    });

    const result = await service.checkConnectivity("user", "device");

    expect(result.online).toBe(true);
    expect(result.message).toBe("Conexão TCP estabelecida.");
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
  });

  it("reports offline when the registered equipment port refuses a connection", async () => {
    server = createServer();
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Could not start test server.");
    const closedPort = address.port;
    await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = undefined;
    prisma.equipment.findUnique.mockResolvedValue({
      id: "device",
      ip: "127.0.0.1",
      port: closedPort,
      networkId: "network"
    });

    const result = await service.checkConnectivity("user", "device");

    expect(result.online).toBe(false);
    expect(result.message).toBe("Sem resposta na porta cadastrada.");
  });

  it("does not check devices outside the user's network membership", async () => {
    prisma.networkMembership.findUnique.mockResolvedValue(null);

    await expect(service.checkConnectivity("user", "device")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
