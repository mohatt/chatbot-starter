import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    ignores: [
      'node_modules',
      '.cache',
      '.next',
      '.vercel',
      'next-env.d.ts',
      'dist',
      'public',
      'components/ai-elements',
      'components/ui',
      'lib/db/schema/auth.ts',
      'lib/db/migrations',
    ],
  },
  {
    name: 'custom-config',
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },
]

export default config
