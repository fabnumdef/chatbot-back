import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entity/intent.entity";
import { ResponseType } from "@core/enum/response-type.enum";

@Entity('response')
export class Response {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @OneToOne(type => Intent, intent => intent.id)
  intent: string;

  @Column('enum', { name: 'type', enum: ResponseType})
  response_type: ResponseType;

  @Column()
  response: string;
}
