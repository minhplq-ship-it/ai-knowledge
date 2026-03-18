import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

export type JwtPayload = {
  sub: string
  email: string
  role: string
}

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: JwtPayload) {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as any,
    })
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    })
  }
}
