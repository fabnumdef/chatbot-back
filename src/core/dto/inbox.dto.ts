import { IsJSON, IsNotEmpty, IsNumber, IsObject, IsString } from "class-validator";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { Intent } from "@core/entities/intent.entity";

export class InboxDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNumber()
  @IsNotEmpty()
  confidence: number;

  @IsJSON()
  @IsNotEmpty()
  intent_ranking: any[];

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsJSON()
  @IsNotEmpty()
  response: any[];

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsNumber()
  @IsNotEmpty()
  responseTime: number;

  @IsString()
  @IsNotEmpty()
  status: InboxStatus;

  @IsObject()
  @IsNotEmpty()
  intent: Intent;
}
