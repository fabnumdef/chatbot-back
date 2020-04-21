import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { ResponseDto } from "@core/dto/response.dto";
import { KnowledgeDto } from "@core/dto/knowledge.dto";

export class IntentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  mainQuestion?: string;

  @IsString()
  @IsOptional()
  status?: IntentStatus;

  @IsNumber()
  @IsOptional()
  createdAt?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: number;

  @IsArray()
  @IsNotEmpty()
  responses?: ResponseDto[];

  @IsArray()
  @IsNotEmpty()
  knowledges?: KnowledgeDto[];
}
