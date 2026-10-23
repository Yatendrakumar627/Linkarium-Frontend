import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily:
    '"Plus Jakarta Sans", "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Outfit", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: '600',
  },
  colors: {
    // Electric Cyan spectrum (#00E5FF)
    cyan: [
      '#e0fcff',
      '#b8f7fe',
      '#85f2fc',
      '#4eedfb',
      '#26e9fa',
      '#00e5ff',
      '#00c7e0',
      '#00acc4',
      '#0090a6',
      '#007185',
    ],
    // Royal Amethyst spectrum (#3B0A6B)
    amethyst: [
      '#f6ebff',
      '#e8d2ff',
      '#d0a6fe',
      '#b675fd',
      '#9e49fc',
      '#8425f3',
      '#6a18b8',
      '#51118f',
      '#3b0a6b',
      '#270448',
    ],
    // Violet map aligned with Royal Amethyst
    violet: [
      '#f6ebff',
      '#e8d2ff',
      '#d0a6fe',
      '#b675fd',
      '#9e49fc',
      '#7c22d6',
      '#6a18b8',
      '#51118f',
      '#3b0a6b',
      '#270448',
    ],
    aurora: [
      '#e0fcff',
      '#b8f7fe',
      '#d0a6fe',
      '#b675fd',
      '#9e49fc',
      '#00e5ff',
      '#6a18b8',
      '#51118f',
      '#3b0a6b',
      '#050505',
    ],
  },
  components: {
    Button: {
      defaultProps: { radius: 'xl' },
    },
    Modal: {
      defaultProps: { centered: true, radius: 'lg' },
    },
    Paper: {
      defaultProps: { radius: 'lg' },
    },
    Input: {
      defaultProps: { radius: 'md' },
    },
  },
})