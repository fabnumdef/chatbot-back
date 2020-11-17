import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateChatbotDto {
  @IsBoolean()
  @IsNotEmpty()
  updateFront: boolean;

  @IsBoolean()
  @IsNotEmpty()
  updateBack: boolean;

  @IsBoolean()
  @IsNotEmpty()
  updateRasa: boolean;

  @IsString()
  @IsOptional()
  frontBranch: string = 'master';

  @IsString()
  @IsOptional()
  backBranch: string = 'master';

  @IsString()
  @IsOptional()
  botBranch: string = 'master';
}
