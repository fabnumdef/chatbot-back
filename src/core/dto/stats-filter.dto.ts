import { IsOptional, IsString, IsNotEmpty, IsDateString } from "class-validator";

export class StatsFilterDto {
  
  @IsOptional()
  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate: string;
  
}