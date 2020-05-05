import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('media')
@Unique(['file'])
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 50 })
  file: string;

  @Column({ nullable: false, default: 0 })
  size: number;

  @Column({ nullable: false, length: 100, default: 'auto' })
  added_by: string;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;

  static getAttributesToSearch() {
    return ['file'];
  }
}
