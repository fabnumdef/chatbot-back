import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { ResponseType } from "@core/enums/response-type.enum";

@Entity('response')
export class Response {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @ManyToOne(type => Intent, intent => intent.responses)
  intent: string;

  @Column('enum', { name: 'type', enum: ResponseType, nullable: false})
  response_type: ResponseType;

  @Column({ nullable: false })
  response: string;
}
