import { randomInt } from 'crypto'
import * as bcrypt from 'bcrypt'

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10

export function generateOtp(length = 6): string {
  const min = 10 ** (length - 1)
  const max = 10 ** length - 1

  return randomInt(min, max).toString()
}

export function getOtpExpiry(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

export async function hashCode(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function compareCode(code: string, hash: string) {
  return bcrypt.compare(code, hash)
}
