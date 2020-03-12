import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from "../user/user.module";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from './auth.controller';
import { JwtModule } from "@nestjs/jwt";
import { jwtConstants } from "./constant";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
    UserModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController]
})
export class AuthModule {}
