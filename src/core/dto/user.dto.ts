import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from "@core/enums/user-role.enum";

export class UserDto {
  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  function: string;

  @IsString()
  role: UserRole;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
