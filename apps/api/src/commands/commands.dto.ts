import { IsIn } from "class-validator";

export const COMMAND_ACTIONS = ["AIR_SENSOR_REQUEST", "MACHINE_MODULE_REQUEST"] as const;
export type CommandAction = (typeof COMMAND_ACTIONS)[number];

export class CreateCommandDto {
  @IsIn(COMMAND_ACTIONS)
  action!: CommandAction;
}

