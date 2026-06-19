import { XStack, View } from 'tamagui'

type Props = {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: Props) {
  return (
    <XStack gap={8} alignItems="center" justifyContent="center">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isCurrent = step === currentStep
        const isCompleted = step < currentStep
        const size = isCurrent ? 10 : 8
        return (
          <View
            key={step}
            width={size}
            height={size}
            borderRadius={size / 2}
            backgroundColor={isCompleted || isCurrent ? '#1F2723' : '#D2D3D3'}
          />
        )
      })}
    </XStack>
  )
}
