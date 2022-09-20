import { Module } from '@nestjs/common';
import { MailService } from "./services/mail.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
    HttpModule
  ],
  providers: [
    MailService
  ],
  exports: [
    MailService
  ]
})
export class SharedModule {}
