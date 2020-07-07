import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@core/entities/user.entity";
import { UserController } from './user.controller';
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    SharedModule
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController]
})
export class UserModule {
}
