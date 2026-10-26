import { IsIn, IsIP, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export const EQUIPMENT_TYPES = ["AIR_SENSOR", "MACHINE_MODULE", "DOSER"] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export class CreateEquipmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsIn(EQUIPMENT_TYPES)
  type!: EquipmentType;

  @IsIP(4)
  ip!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(EQUIPMENT_TYPES)
  type?: EquipmentType;

  @IsOptional()
  @IsIP(4)
  ip?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;
}
