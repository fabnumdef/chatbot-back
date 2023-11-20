import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from '@core/entities/feedback.entity';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import * as moment from 'moment';
import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import { InboxService } from '../inbox/inbox.service';
import { BotLogger } from '../logger/bot.logger';

@Injectable()
export class FeedbackService {
  private readonly _logger = new BotLogger('FeedbackService');

  constructor(
    @InjectRepository(Feedback)
    private readonly _feedbacksRepository: Repository<Feedback>,
    private readonly _inboxService: InboxService,
  ) {}

  /**
   * Création d'un feedback
   * On vérifie que l'utilisateur n'en ait pas déjà crée un pour la même question
   * Si oui, on le met à jour avec le nouveau statut renvoyé, sinon on le crée
   * @param feedback
   */
  async createSafe(feedback: Feedback): Promise<Feedback> {
    const fEntity = await this._feedbacksRepository.findOne({
      where: {
        user_question: feedback.user_question,
        timestamp: feedback.timestamp,
      },
    });
    if (!fEntity) {
      return this._feedbacksRepository.save(feedback);
    }
    if (fEntity && fEntity.status !== feedback.status) {
      await this._feedbacksRepository.update(
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
    const feedbacks: Feedback[] = await this._feedbacksRepository.find({
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
      const updated = await this._inboxService.updateInboxWithFeedback(
        feedback,
      );
      if (updated) {
        toDelete.push(feedback.id);
      }
    }
    if (toDelete && toDelete.length > 0) {
      await this._feedbacksRepository.delete({
        id: In(toDelete),
      });
      this._logger.log(`Finishing updating ${toDelete.length} feedbacks`);
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
    const query = this._feedbacksRepository
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
