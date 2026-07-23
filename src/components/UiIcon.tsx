import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

const DEFAULT_STROKE = 1.5

interface UiIconProps {
  icon: IconSvgElement
  size?: number
  strokeWidth?: number
  className?: string
}

/** Chrome icons only. Game symbols stay on SymbolIcon / card art. */
export function UiIcon({
  icon,
  size = 18,
  strokeWidth = DEFAULT_STROKE,
  className,
}: UiIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    />
  )
}
