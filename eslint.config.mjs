import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    ignores: [
      'node_modules',
      '.next',
      '.vercel',
      'dist',
      'public',
      'components/ai-elements',
      'components/ui',
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
