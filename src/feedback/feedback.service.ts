import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Feedback } from "@core/entities/feedback.entity";
import { Repository } from "typeorm";

@Injectable()
export class FeedbackService {

  constructor(@InjectRepository(Feedback)
              private readonly _feedbacksRepository: Repository<Feedback>,) {
  }

  async createSafe(feedback: Feedback): Promise<Feedback> {
    console.log('Create safe feedback', feedback);
    const fEntity = await this._feedbacksRepository.findOne({user_question: feedback.user_question, timestamp: feedback.timestamp});
    if(!fEntity) {
      console.log('Saving feedback');
      return this._feedbacksRepository.save(feedback);
    }
    if(fEntity && fEntity.status !== feedback.status) {
      this._feedbacksRepository.update({id: fEntity.id}, {status: feedback.status});
    }
    return feedback;
  }

}
