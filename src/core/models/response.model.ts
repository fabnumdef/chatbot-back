import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ResponseType } from '@core/enums/response-type.enum';

export class ResponseModel {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  intentId: string;

  @IsString()
  @IsNotEmpty()
  response_type: ResponseType;

  @IsString()
  @IsNotEmpty()
  response: string;
}
