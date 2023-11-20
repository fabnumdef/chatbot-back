import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import MailService from './services/mail.service';

@Module({
  imports: [HttpModule],
  providers: [MailService],
  exports: [MailService],
})
export default class SharedModule {}
