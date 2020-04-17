import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class FileHistoricDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  createdAt: string;
}
