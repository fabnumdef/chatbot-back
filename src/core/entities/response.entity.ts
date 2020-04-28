import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { ResponseType } from "@core/enums/response-type.enum";

@Entity('response')
export class Response {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Intent, intent => intent.responses)
  intent: Intent;

  @Column('enum', { name: 'type', enum: ResponseType, nullable: false})
  response_type: ResponseType;

  @Column({ nullable: false, length: 2000 })
  response: string;
}
