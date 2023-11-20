import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Events } from '@core/entities/events.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inbox } from '@core/entities/inbox.entity';
import { EventActionTypeEnum } from '@core/enums/event-action-type.enum';
import { Intent } from '@core/entities/intent.entity';
import { InboxStatus } from '@core/enums/inbox-status.enum';
import { truncateString } from '@core/utils';
import IntentService from '../intent/intent.service';
import BotLogger from '../logger/bot.logger';

@Injectable()
export default class InboxFillService {
  private readonly logger = new BotLogger('InboxFillService');

  constructor(
    @InjectRepository(Events)
    private readonly eventsRepository: Repository<Events>,
    @InjectRepository(Inbox)
    private readonly inboxesRepository: Repository<Inbox>,
    private readonly intentService: IntentService,
  ) {}

  /**
   * Vérification des derniers événements de RASA pour remplir la table des requêtes
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkEvents() {
    // Récupération du timestamp max des requêtes
    const maxTimestamp = (
      await this.inboxesRepository
        .createQueryBuilder()
        .select('MAX(timestamp)', 'timestamp')
        .getRawOne()
    )?.timestamp;

    // Récupération de tout les événements qui ont eu lieu après ce timestamp
    const events: Events[] = await this.eventsRepository.find({
      where: {
        timestamp: MoreThan(maxTimestamp || 0),
      },
      order: {
        sender_id: 'ASC',
        timestamp: 'ASC',
      },
    });

    if (events.length < 1) {
      return;
    }

    const inboxes: Inbox[] = [];
    while (events.length > 0) {
      // Une question de l'utilisateur se termine lorsque RASA recommence à écouter
      const conversationIdx = events.findIndex(
        (e) => e.action_name === EventActionTypeEnum.action_listen,
      );
      // On récupère donc tout les événements RASA jusqu'au premier 'action_listen'
      const eventsSlice = events.slice(0, conversationIdx + 1);
      // On vérifie qu'il s'agit d'une question d'un utilisateur (ça peut être par exemple seulement la connection d'un utilisateur)
      if (this.canGenerateInbox(eventsSlice)) {
        // On récupère la requête à sauvegarder en BDD
        const inbox = this.getNextInbox(eventsSlice);
        // Si elle est bien associée à une connaissance on la sauvegarge
        if (
          inbox.intent?.id &&
          (await this.intentService.intentExists(inbox.intent.id))
        ) {
          inboxes.push(inbox);
        }
      }
      // On itère ainsi sur tout les blocs d'événements RASA
      conversationIdx >= 0
        ? events.splice(0, conversationIdx + 1)
        : events.splice(0, events.length);
    }

    if (inboxes.length > 0) {
      await this.inboxesRepository.save(inboxes);
      this.logger.log(`Finishing updating ${inboxes.length} inbox`);
    }
  }

  /**
   * Construction de la requête avec les informations des événements RASA
   * @param events
   * @private
   */
  private getNextInbox(events: Events[]): Inbox {
    const inbox = new Inbox();
    let getMessageTimestamp: number;
    let sendMessageTimestamp: number;
    inbox.timestamp = Math.max.apply(
      Math,
      events.map((e) => e.timestamp),
    );

    inbox.sender_id = events[0]?.sender_id;
    inbox.event_id = events[0]?.id;
    inbox.response = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      // @ts-ignore
      const data = JSON.parse(event?.data);

      switch (data?.event) {
        case 'action':
          // Pas d'utilité pour le Backoffice
          break;
        case 'bot':
          // Récupération de la réponse du Chatbot
          inbox.response.push({ text: data.text, data: data.data });
          sendMessageTimestamp = data.timestamp;
          break;
        case 'user':
          // Récupération de la question de l'utilisateur
          // Si le bot n'a pas réussi à détecter la question on filtre un peu les données pour le Backoffice
          if (data.parse_data?.intent?.name === 'nlu_fallback') {
            // @ts-ignore
            data.parse_data?.intent_ranking =
              data.parse_data?.intent_ranking?.filter(
                (i) => i.name !== 'nlu_fallback',
              );
            // @ts-ignore
            data.parse_data?.intent = data.parse_data?.intent_ranking[0];
          }
          // Question is limited at 2000 char
          inbox.question = truncateString(data.text, 1900);
          inbox.confidence = data.parse_data?.intent?.confidence
            ? data.parse_data?.intent?.confidence
            : 0;
          inbox.intent_ranking = data.parse_data?.intent_ranking?.slice(0, 5);
          inbox.status =
            inbox.confidence >= 0.6
              ? inbox.confidence >= 0.95
                ? InboxStatus.confirmed
                : InboxStatus.to_verify
              : InboxStatus.pending;
          inbox.intent = new Intent(data.parse_data?.intent?.name);
          getMessageTimestamp = data.timestamp;
          break;
      }
    }
    inbox.response = JSON.stringify(inbox.response);
    inbox.intent_ranking = JSON.stringify(inbox.intent_ranking);
    inbox.response_time = Math.round(
      (sendMessageTimestamp - getMessageTimestamp) * 1000,
    );
    if (isNaN(inbox.response_time)) {
      inbox.response_time = 100;
    }
    return inbox;
  }

  /**
   * Une requête peut être générée s'il y a un événement user et un événement bot (question / réponse)
   * @param events
   * @private
   */
  private canGenerateInbox(events: Events[]): boolean {
    return (
      events.findIndex((e) => e.type_name === 'user') >= 0 &&
      events.findIndex((e) => e.type_name === 'bot') >= 0
    );
  }
}
