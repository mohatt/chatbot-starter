import { EmailTemplate as AuthEmailTemplate } from '@daveyplate/better-auth-ui/server'
import { config } from '@/lib/config'
import type { AuthUser } from '@/lib/auth'
import type { EmailMessage } from './template'

export interface ResetPasswordProps extends Pick<AuthUser, 'email' | 'name'> {
  url: string
  token: string
}

export function ResetPassword(props: ResetPasswordProps): EmailMessage<'auth/reset-password'> {
  const { name, email, url, token } = props
  return {
    template: 'auth/reset-password',
    key: `auth/reset-password/${token}`,
    subject: `Reset your password`,
    body: AuthEmailTemplate({
      preview: 'Reset your password - Action required',
      heading: 'Reset your password',
      content: (
        <>
          <p>Hello {name || email.split('@')[0]},</p>
          <p>
            We received a password reset request for your account associated with{' '}
            <strong>{email}</strong>.
          </p>
          <p>
            Click the button below to create a new password. This link will expire in 24 hours for
            security reasons.
          </p>
        </>
      ),
      action: 'Reset Password',
      siteName: config.appName,
      baseUrl: config.baseUrl,
      url,
    }),
  }
}
