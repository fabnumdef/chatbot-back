import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('faq_events')
export class FaqEvents {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({length: '255', nullable: false})
  sender_id: string;

  @Column({length: '255', nullable: false})
  type_name: string;

  @CreateDateColumn({type: 'timestamp'})
  timestamp: number;

  @Column({length: '255', nullable: true})
  intent_name: string;

  @Column({length: '255', nullable: true})
  category_name: string;
}
