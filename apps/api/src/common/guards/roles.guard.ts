import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    // Không có @Roles() thì cho qua
    if (!requiredRoles) return true

    const { user } = context.switchToHttp().getRequest()
    console.log('Required roles:', requiredRoles) // ← thêm
    console.log('User role:', user?.role) // ← thêm

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này')
    }

    return true
  }
}
