import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@core/entities/user.entity';
import UserService from './user.service';
import UserController from './user.controller';
import SharedModule from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SharedModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export default class UserModule {}
