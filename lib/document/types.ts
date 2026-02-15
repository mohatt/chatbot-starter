export interface DocumentInterface<Metadata extends Record<string, any>> {
  id: string
  data: string
  metadata: Metadata
}
