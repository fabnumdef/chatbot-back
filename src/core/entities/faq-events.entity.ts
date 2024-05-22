import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('faq_events')
export class FaqEvents {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: '255', nullable: false })
  sender_id: string;

  @Index()
  @Column({ length: '255', nullable: false })
  type_name: string;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  timestamp: number;

  @Index()
  @Column({ length: '255', nullable: true })
  intent_name: string;

  @Index()
  @Column({ length: '255', nullable: true })
  category_name: string;
}
