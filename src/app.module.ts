import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { IntentModule } from './intent/intent.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { User } from "./core/entity/user.entity";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABSE_HOST,
      port: Number(process.env.DATABSE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      "entities": [User],
      "synchronize": true
    }),
    AuthModule,
    UserModule,
    IntentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
