import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Knowledge } from "@core/entities/knowledge.entity";
import { Response } from "@core/entities/response.entity";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { Inbox } from "@core/entities/inbox.entity";

@Entity('intent')
export class Intent {
  @PrimaryColumn()
  id: string;

  @Column({nullable: true, length: 255})
  category?: string;

  @Column({nullable: true, length: 255})
  main_question?: string;

  @Column({default: IntentStatus.to_deploy})
  status: IntentStatus;

  @OneToMany(type => Knowledge, knowledge => knowledge.intent, {cascade: true})
  knowledges: Knowledge[];

  @OneToMany(type => Response, response => response.intent, {cascade: true})
  responses: Response[];

  @OneToMany(type => Inbox, inbox => inbox.intent)
  inboxes: Inbox[];

  @Column({type: "timestamp", nullable: true})
  expires_at: number;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;

  @UpdateDateColumn({type: "timestamp"})
  updated_at: number;

  constructor(id) {
    this.id = id;
  }

  static getAttributesToSearch() {
    return ['id', 'category', 'main_question'];
  }

}
