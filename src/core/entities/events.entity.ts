import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { EventActionTypeEnum } from "@core/enums/event-action-type.enum";
import { EventDataModel } from "@core/models/event-data.model";

@Entity('events')
export class Events {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({length: '255', nullable: false})
  sender_id: string;

  @Column({length: '255', nullable: false})
  type_name: string;

  @Column({type: 'double precision', nullable: true})
  timestamp: number;

  @Column({length: '255', nullable: true})
  intent_name: string;

  @Column({length: '255', nullable: true})
  action_name: EventActionTypeEnum;

  @Column({type: 'text', nullable: true})
  data: EventDataModel;
}
