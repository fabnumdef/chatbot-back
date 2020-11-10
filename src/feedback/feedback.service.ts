import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Feedback } from "@core/entities/feedback.entity";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InboxService } from "../inbox/inbox.service";
import { In } from "typeorm/index";
import * as moment from 'moment';
import { StatsFilterDto } from "@core/dto/stats-filter.dto";

@Injectable()
export class FeedbackService {

  constructor(@InjectRepository(Feedback)
              private readonly _feedbacksRepository: Repository<Feedback>,
              private readonly _inboxService: InboxService) {
  }

  async createSafe(feedback: Feedback): Promise<Feedback> {
    const fEntity = await this._feedbacksRepository.findOne({
      user_question: feedback.user_question,
      timestamp: feedback.timestamp
    });
    if (!fEntity) {
      return this._feedbacksRepository.save(feedback);
    }
    if (fEntity && fEntity.status !== feedback.status) {
      this._feedbacksRepository.update({id: fEntity.id}, {status: feedback.status});
    }
    return feedback;
  }

  // Check last feedbacks to update Inbox
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkFeedbacks() {
    const feedbacks: Feedback[] = await this._feedbacksRepository.find({
      order: {
        timestamp: 'ASC'
      }
    });

    if (feedbacks.length < 1) {
      return;
    }

    const toDelete = [];
    for(let i = 0; i < feedbacks.length; i++) {
      const feedback = feedbacks[i];
      const updated = await this._inboxService.updateInboxWithFeedback(feedback);
      if(updated) {
        toDelete.push(feedback.id);
      }
    }
    if(toDelete && toDelete.length > 0) {
      await this._feedbacksRepository.delete({
        id: In(toDelete)
      });
      console.log(`${new Date().toLocaleString()} - Finishing updating ${toDelete.length} feedbacks`);
    }
  }

  findNbFeedbackByTime(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : (moment().subtract(1, 'month').format('YYYY-MM-DD'));
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    const query = this._feedbacksRepository.createQueryBuilder('feedback')
      .select("DATE(feedback.created_at) AS date")
      .addSelect("COUNT(*) AS count")
      .where(`DATE(feedback.created_at) >= '${startDate}'`)
      .andWhere(`DATE(feedback.created_at) <= '${endDate}'`)
      .groupBy("DATE(feedback.created_at)")
      .orderBy("DATE(feedback.created_at)", 'ASC');
    return query.getRawMany();
  }
}
