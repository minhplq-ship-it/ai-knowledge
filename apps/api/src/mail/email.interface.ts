export interface VerifyEmailPayload {
  email: string
  code: string
  name?: string
}

export interface ForgotPasswordPayload {
  email: string
  code: string
  name?: string
}