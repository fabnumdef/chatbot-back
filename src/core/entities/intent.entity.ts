import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Knowledge } from "@core/entities/knowledge.entity";
import { Response } from "@core/entities/response.entity";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { Inbox } from "@core/entities/inbox.entity";

@Entity('intent')
export class Intent {
  @PrimaryColumn()
  id: string;

  @Column({nullable: true})
  category?: string;

  @Column({nullable: true})
  main_question?: string;

  @Column({default: 'active'})
  status: IntentStatus;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;

  @OneToMany(type => Knowledge, knowledge => knowledge.intent)
  knowledges: Knowledge[];

  @OneToMany(type => Response, response => response.intent)
  responses: Response[];

  @OneToMany(type => Inbox, inbox => inbox.intent)
  inboxes: Inbox[];

  constructor(id) {
    this.id = id;
  }

}
