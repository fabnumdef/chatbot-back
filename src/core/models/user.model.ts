import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from "@core/enums/user-role.enum";

export class UserModel {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  function: string;

  @IsString()
  @IsOptional()
  role: UserRole;

  @IsString()
  @IsOptional()
  password: string;
}
