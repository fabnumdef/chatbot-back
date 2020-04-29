import { IsHexColor, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsHexColor()
  @IsNotEmpty()
  @MaxLength(20)
  primaryColor: string;

  @IsHexColor()
  @IsNotEmpty()
  @MaxLength(20)
  secondaryColor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  problematic: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  audience: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  solution: string;
}
