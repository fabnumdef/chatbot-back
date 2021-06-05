import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf
} from "class-validator";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { ResponseDto } from "@core/dto/response.dto";
import { KnowledgeDto } from "@core/dto/knowledge.dto";
import { AppConstants } from "@core/constant";

export class IntentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  category?: string;

  @ValidateIf(intent => !AppConstants.General.excluded_Ids.includes(intent.id))
  @IsNotEmpty()
  mainQuestion?: string;

  @IsString()
  @IsOptional()
  status?: IntentStatus;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

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
  @IsOptional()
  knowledges?: KnowledgeDto[];
}
