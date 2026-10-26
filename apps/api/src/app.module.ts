import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { EquipmentController } from "./equipment/equipment.controller";
import { EquipmentService } from "./equipment/equipment.service";
import { CommandsController } from "./commands/commands.controller";
import { CommandsService } from "./commands/commands.service";
import { NetworksController } from "./networks/networks.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "8h" }
    })
  ],
  controllers: [AuthController, NetworksController, EquipmentController, CommandsController],
  providers: [AuthService, JwtAuthGuard, EquipmentService, CommandsService]
})
export class AppModule {}

