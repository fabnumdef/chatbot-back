import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class KnowledgeModel {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  intentId: string;

  @IsString()
  @IsNotEmpty()
  question: string;
}
