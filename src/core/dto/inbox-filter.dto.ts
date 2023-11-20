import { IsOptional } from 'class-validator';

export class InboxFilterDto {
  @IsOptional()
  categories: string[];

  @IsOptional()
  statutes: string[];

  @IsOptional()
  startDate: string;

  @IsOptional()
  endDate: string;

  @IsOptional()
  assignedTo: string;

  @IsOptional()
  assignedToAll: string;
}
