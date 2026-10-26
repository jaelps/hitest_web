import { validate } from "class-validator";
import { CreateEquipmentDto } from "./equipment.dto";

describe("CreateEquipmentDto", () => {
  it("accepts a valid IPv4 address and port", async () => {
    const dto = Object.assign(new CreateEquipmentDto(), {
      name: "Sensor",
      type: "AIR_SENSOR",
      ip: "192.168.1.25",
      port: 8080
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(["https://example.com/airon1", "localhost", "999.1.1.1"])("rejects non-IPv4 address %s", async (ip) => {
    const dto = Object.assign(new CreateEquipmentDto(), {
      name: "Sensor",
      type: "AIR_SENSOR",
      ip,
      port: 80
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("rejects ports outside the TCP range", async () => {
    const dto = Object.assign(new CreateEquipmentDto(), {
      name: "Sensor",
      type: "AIR_SENSOR",
      ip: "192.168.1.25",
      port: 65536
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
