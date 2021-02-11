import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { ResponseModel } from "@core/models/response.model";
import { KnowledgeModel } from "@core/models/knowledge.model";

export class IntentModel {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  category: string;

  @IsString()
  @IsNotEmpty()
  main_question: string;

  @IsString()
  @IsNotEmpty()
  status: IntentStatus;

  @IsBoolean()
  @IsOptional()
  hidden: boolean;

  @IsNumber()
  @IsOptional()
  expires_at?: number;

  @IsObject()
  @IsNotEmpty()
  responses?: ResponseModel[];

  @IsObject()
  @IsNotEmpty()
  knowledges?: KnowledgeModel[];

  @IsObject()
  @IsNotEmpty()
  previousIntents?: IntentModel[];

  @IsObject()
  @IsNotEmpty()
  nextIntents?: IntentModel[];
}
