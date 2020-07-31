import { IsNotEmpty, IsString } from "class-validator";
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
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  status: FeedbackStatus;
}
