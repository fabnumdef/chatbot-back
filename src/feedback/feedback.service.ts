import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from '@core/entities/feedback.entity';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import * as moment from 'moment';
import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import InboxService from '../inbox/inbox.service';
import BotLogger from '../logger/bot.logger';

@Injectable()
export default class FeedbackService {
  private readonly logger = new BotLogger('FeedbackService');

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbacksRepository: Repository<Feedback>,
    private readonly inboxService: InboxService,
  ) {}

  /**
   * Création d'un feedback
   * On vérifie que l'utilisateur n'en ait pas déjà crée un pour la même question
   * Si oui, on le met à jour avec le nouveau statut renvoyé, sinon on le crée
   * @param feedback
   */
  async createSafe(feedback: Feedback): Promise<Feedback> {
    const fEntity = await this.feedbacksRepository.findOne({
      where: {
        user_question: feedback.user_question,
        timestamp: feedback.timestamp,
      },
    });
    if (!fEntity) {
      return this.feedbacksRepository.save(feedback);
    }
    if (fEntity && fEntity.status !== feedback.status) {
      await this.feedbacksRepository.update(
        { id: fEntity.id },
        { status: feedback.status },
      );
    }
    return feedback;
  }

  /**
   * Vérification des derniers feedbacks pour mettre à jour les Inbox
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkFeedbacks() {
    const feedbacks: Feedback[] = await this.feedbacksRepository.find({
      order: {
        timestamp: 'ASC',
      },
    });

    // S'il n'y en a pas on ne fait rien
    if (feedbacks.length < 1) {
      return;
    }

    const toDelete = [];
    for (let i = 0; i < feedbacks.length; i++) {
      const feedback = feedbacks[i];
      // On associe une requête au feedback, si celle-ci est trouvée on peut supprimer le feedback
      const updated = await this.inboxService.updateInboxWithFeedback(feedback);
      if (updated) {
        toDelete.push(feedback.id);
      }
    }
    if (toDelete && toDelete.length > 0) {
      await this.feedbacksRepository.delete({
        id: In(toDelete),
      });
      this.logger.log(`Finishing updating ${toDelete.length} feedbacks`);
    }
  }

  /**
   * Récupération du nombre de feedbacks par jour
   * Possibilité de filtrer par dates
   * @param filters
   */
  findNbFeedbackByTime(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().subtract(1, 'month').format('YYYY-MM-DD');
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');
    const query = this.feedbacksRepository
      .createQueryBuilder('feedback')
      .select('DATE(feedback.created_at) AS date')
      .addSelect('COUNT(*) AS count')
      .where(`DATE(feedback.created_at) >= '${startDate}'`)
      .andWhere(`DATE(feedback.created_at) <= '${endDate}'`)
      .groupBy('DATE(feedback.created_at)')
      .orderBy('DATE(feedback.created_at)', 'ASC');
    return query.getRawMany();
  }
}
