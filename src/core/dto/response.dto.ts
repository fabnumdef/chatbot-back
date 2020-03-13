import { IsNumber, IsOptional, IsString } from "class-validator";
import { ResponseType } from "@core/enum/response-type.enum";

export class ResponseDto {
  @IsNumber()
  @IsOptional()
  id: number;

  @IsString()
  intent: string;

  @IsString()
  responseType: ResponseType;

  @IsString()
  response: string;
}
