import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ResponseType } from '@core/enums/response-type.enum';

export class ResponseDto {
  @IsNumber()
  @IsOptional()
  id: number;

  @IsString()
  intentId: string;

  @IsString()
  responseType: ResponseType;

  @IsString()
  response: string;
}
