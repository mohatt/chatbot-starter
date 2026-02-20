import type { JSX } from 'react'

export interface EmailMessage<T extends string> {
  template: T
  key: `${T}/${string}`
  subject: string
  body: string | JSX.Element
}

export interface EmailTemplate<T extends string, P extends Record<string, any>> {
  (props: P): EmailMessage<T>
}
