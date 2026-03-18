import { randomInt } from 'crypto'

export function generateOtp(length = 6): string {
  const min = 10 ** (length - 1)
  const max = 10 ** length - 1

  return randomInt(min, max).toString()
}

export function getOtpExpiry(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}
