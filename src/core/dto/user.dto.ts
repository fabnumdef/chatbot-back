import { IsString } from 'class-validator';
import { UserRole } from "@core/enum/user-role.enum";

export class UserDto {
  @IsString()
  email: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  function: string;

  @IsString()
  role: UserRole;
}
