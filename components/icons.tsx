export const VercelIcon = ({ size = 17 }) => {
  return (
    <svg
      height={size}
      strokeLinejoin='round'
      style={{ color: 'currentcolor' }}
      viewBox='0 0 16 16'
      width={size}
    >
      <path clipRule='evenodd' d='M8 1L16 15H0L8 1Z' fill='currentColor' fillRule='evenodd' />
    </svg>
  )
}

export const GithubIcon = ({ size = 16 }) => {
  return (
    <svg width={size} height={size} viewBox='0 0 512 512'>
      <path
        d='M256 512c-141 0-256-115-256-256 0-113 73-209 175-243 13-2 18 6 18 12 0 6-1 27-1 48-71-15-86 30-86 30-12 30-28 38-28 38-24 16 1 15 1 15 26-2 40-26 40-26 22-39 59-28 74-21 2 16 9 27 16 34-57 6-116 28-116 126 0 28 10 51 26 69-3 7-11 33 3 68 0 0 21 7 70-26 20 5 42 8 64 8 22 0 44-3 64-8 49 33 70 26 70 26 14-35 6-61 3-68 16-18 26-41 26-69 0-98-60-120-117-126 10-8 18-24 18-47 0-35-1-62-1-71 0-6 5-14 18-12 102 34 175 130 175 243 0 141-115 256-256 256z'
        transform='scale(1, -1) translate(0, -512)'
        fill='currentColor'
      />
    </svg>
  )
}
