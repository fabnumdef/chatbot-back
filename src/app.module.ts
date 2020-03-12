import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { IntentModule } from './intent/intent.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { User } from "@core/entity/user.entity";
import { Intent } from "@core/entity/intent.entity";
import { KnowledgeModule } from './knowledge/knowledge.module';
import { Knowledge } from "@core/entity/knowledge.entity";
import { ResponseModule } from './response/response.module';
import { Response } from "@core/entity/response.entity";

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
      "entities": [User, Intent, Knowledge, Response],
      "synchronize": true
    }),
    AuthModule,
    UserModule,
    IntentModule,
    KnowledgeModule,
    ResponseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
