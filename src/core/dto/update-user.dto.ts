import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { UserRole } from "@core/enums/user-role.enum";

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  function: string;

  @IsBoolean()
  @IsOptional()
  disabled: boolean;

  @IsEnum(UserRole)
  @IsOptional()
  role: UserRole;
}
