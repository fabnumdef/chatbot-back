import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as path from 'path';
import BotLogger from '../../logger/bot.logger';

@Injectable()
export default class MailService {
  private readonly logger = new BotLogger('MailService');

  private appDir = path.resolve(__dirname, '../../../../chatbot-back');

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Envoi d'un email
   * @param email: Adress to ship the email
   * @param subject: subject of the email
   * @param template: name of the template
   * @param context: context to pass to the template
   */
  sendEmail(
    email: string,
    subject: string,
    template: string,
    context?: any,
  ): Promise<any> {
    return this.mailerService
      .sendMail({
        to: email,
        from: `${
          process.env.MAIL_FROM ? process.env.MAIL_FROM : process.env.MAIL_USER
        }`,
        subject,
        template: path.resolve(this.appDir, 'templates', template),
        context,
      })
      .then(() => {
        this.logger.log(
          `MAIL SEND TO: ${email} WITH SUBJECT: ${subject} WITH TEMPLATE: ${template} AND CONTEXT: ${JSON.stringify(
            context,
          )}`,
        );
      })
      .catch((error) => {
        this.logger.error(
          `FAIL - MAIL SEND TO: ${email} WITH SUBJECT: ${subject} WITH TEMPLATE: ${template} AND CONTEXT: ${JSON.stringify(
            context,
          )}`,
          error,
        );
        throw new HttpException(
          "Une erreur est survenue dans l'envoi du mail.",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });
  }
}
