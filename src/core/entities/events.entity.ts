import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EventActionTypeEnum } from '@core/enums/event-action-type.enum';
import { EventDataModel } from '@core/models/event-data.model';

@Entity('events')
export class Events {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: '255', nullable: false })
  sender_id: string;

  @Column({ length: '255', nullable: false })
  type_name: string;

  @Index()
  @Column({ type: 'double precision', nullable: true })
  timestamp: number;

  @Index()
  @Column({ length: '255', nullable: true })
  intent_name: string;

  @Column({ type: "enum", enum: EventActionTypeEnum, enumName: "EventActionTypeEnum", nullable: true })
  action_name: EventActionTypeEnum;

  @Column({ type: 'text', nullable: true })
  data: EventDataModel;
}
