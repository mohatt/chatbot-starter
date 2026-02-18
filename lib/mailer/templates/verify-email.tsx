import { EmailTemplate } from '@daveyplate/better-auth-ui/server'
import { config } from '@/lib/config'

export interface VerifyEmailProps {
  name?: string
  email: string
  url: string
}

export function VerifyEmail(props: VerifyEmailProps) {
  const { name, email, url } = props
  return {
    subject: `Verify your email`,
    body: EmailTemplate({
      preview: 'Verify your email address - Action required',
      heading: 'Verify your email address',
      content: (
        <>
          <p>Hello {name || email.split('@')[0]},</p>
          <p>
            Thanks for signing up! To complete your registration and secure your account, please
            verify your email address <strong>{email}</strong> by clicking the button below.
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
