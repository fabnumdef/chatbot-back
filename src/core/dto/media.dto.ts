import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { IntentDto } from '@core/dto/intent.dto';

export class MediaDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  file: string;

  @IsNumber()
  @IsNotEmpty()
  size: number;

  @IsString()
  @IsNotEmpty()
  addedBy: string;

  @IsString()
  @IsNotEmpty()
  createdAt: string;

  @IsObject()
  @IsOptional()
  intents: IntentDto[];
}
