import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class MediaDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  file: string;

  @IsString()
  @IsNotEmpty()
  createdAt: string;
}
