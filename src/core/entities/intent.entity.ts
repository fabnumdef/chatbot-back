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

  @OneToMany(type => Knowledge, knowledge => knowledge.intent)
  knowledges: Knowledge[];

  @OneToMany(type => Response, response => response.intent)
  responses: Response[];

  @OneToMany(type => Inbox, inbox => inbox.intent)
  inboxes: Inbox[];

  @Column({type: "timestamp", nullable: true})
  expires_at: number;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;

  constructor(id) {
    this.id = id;
  }

}
