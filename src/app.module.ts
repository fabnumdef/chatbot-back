import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { IntentModule } from './intent/intent.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UserModule, IntentModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
