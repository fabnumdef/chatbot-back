import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class IntentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  mainQuestion?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  createdAt?: number;
}
