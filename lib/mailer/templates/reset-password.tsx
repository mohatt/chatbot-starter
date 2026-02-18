import { EmailTemplate } from '@daveyplate/better-auth-ui/server'
import { config } from '@/lib/config'

export interface ResetPasswordProps {
  name?: string
  email: string
  url: string
}

export function ResetPassword(props: ResetPasswordProps) {
  const { name, email, url } = props
  return {
    subject: `Reset your password`,
    body: EmailTemplate({
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
