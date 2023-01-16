import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from "@core/entities/user.entity";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private _reflector: Reflector) {
  }

  /**
   * Récupération des rôles autorisés via le décorateur @Roles de la route
   * Vérfication si le rôle de l'utilisateur est présent dans cette liste
   * @param context
   */
  canActivate(context: ExecutionContext): boolean {
    const roles = this._reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    return roles.includes(user.role);
  }
}
