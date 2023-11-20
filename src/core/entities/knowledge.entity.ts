import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Intent } from '@core/entities/intent.entity';

@Entity('knowledge')
@Unique(['intent', 'question'])
export class Knowledge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne((type) => Intent, (intent) => intent.knowledges)
  intent: Intent;

  @Column({ nullable: false, length: 255 })
  question: string;
}
