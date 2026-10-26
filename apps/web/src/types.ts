export type EquipmentType = "AIR_SENSOR" | "MACHINE_MODULE" | "DOSER";

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  ip: string;
  port: number;
  networkId: string;
  createdAt: string;
}

export interface Network {
  id: string;
  name: string;
}

export interface CommandLog {
  id: string;
  action: string;
  path: string;
  success: boolean;
  statusCode: number | null;
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
  equipment: Pick<Equipment, "id" | "name" | "type">;
  user: { name: string };
}

export interface ConnectivityResult {
  online: boolean;
  checkedAt: string;
  responseTimeMs: number;
  message: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
