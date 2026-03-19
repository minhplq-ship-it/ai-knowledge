import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtTokenService } from '../services/jwt-token.service'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const token = req.cookies?.accessToken 

    if (!token) {
      throw new UnauthorizedException('No token found')
    }

    try {
      const payload = this.jwtService.verifyToken(token) 
      req.user = payload 
      return true
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
