import { Button } from '@mantine/core'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'
import './ErrorState.css'

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="empty-wrap fade-up">
      <div>
        <div className="empty-orb error-orb">
          <IconAlertTriangle size={30} />
        </div>
        <div className="error-state-title">Couldn’t load your data</div>
        <div className="error-state-message">{message}</div>
        {onRetry && (
          <Button
            className="error-state-retry gradient-btn"
            variant="filled"
            leftSection={<IconRefresh size={15} />}
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}