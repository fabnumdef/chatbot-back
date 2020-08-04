import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { FeedbackStatus } from "@core/enums/feedback-status.enum";

export class FeedbackDto {
  @IsString()
  @IsNotEmpty()
  userQuestion: string;

  @IsString()
  @IsNotEmpty()
  botResponse: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsString()
  @IsNotEmpty()
  status: FeedbackStatus;
}
