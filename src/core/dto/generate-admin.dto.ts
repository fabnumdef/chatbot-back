import { IsNotEmpty, IsString } from "class-validator";

export class GenerateAdminDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
