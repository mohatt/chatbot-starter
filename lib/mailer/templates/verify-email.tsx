import { EmailTemplate as AuthEmailTemplate } from '@daveyplate/better-auth-ui/server'
import { config } from '@/lib/config'
import type { AuthUser } from '@/lib/auth'
import type { EmailMessage } from './template'

export interface VerifyEmailProps extends Pick<AuthUser, 'email' | 'name'> {
  url: string
  token: string
}

export function VerifyEmail(props: VerifyEmailProps): EmailMessage<'auth/verify-email'> {
  const { name, email, url, token } = props
  return {
    template: 'auth/verify-email',
    key: `auth/verify-email/${token}`,
    subject: `Verify your email`,
    body: AuthEmailTemplate({
      preview: 'Verify your email address - Action required',
      heading: 'Verify your email address',
      content: (
        <>
          <p>Hello {name || email.split('@')[0]},</p>
          <p>
            Thanks for signing up! To complete your registration, please verify your email address{' '}
            <strong>{email}</strong> by clicking the button below.
            <br />
            <i>This link will expire in 24 hours for security reasons.</i>
          </p>
        </>
      ),
      action: 'Verify Email Address',
      siteName: config.appName,
      baseUrl: config.baseUrl,
      url,
    }),
  }
}
