import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily:
    '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: '"Space Grotesk", "Inter", sans-serif',
    fontWeight: '600',
  },
  colors: {
    aurora: [
      '#ecf2ff',
      '#dbe3ff',
      '#b8c6ff',
      '#94a5ff',
      '#7b8bff',
      '#6c7bff',
      '#8b5cf6',
      '#5a4bd6',
      '#4538ad',
      '#2f277b',
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