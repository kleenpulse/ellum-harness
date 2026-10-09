import Image from "next/image"
import { Avatar, Style } from "@dicebear/core"
import gaze from "@dicebear/styles/gaze.json"

import { cn } from "@/lib/utils"

const gazeStyle = new Style(gaze)

type ChatAvatarProps = {
  seed: string
  animated?: boolean
  className?: string
}

/** Raw SVG markup, for inline rendering where the eyes (`.dbga-look`) need styling. */
export function gazeSvg(seed: string, animated = false) {
  return new Avatar(gazeStyle, {
    seed,
    tags: [animated ? "animation" : "!animation"],
  }).toString()
}

export function ChatAvatar({ seed, animated = false, className }: ChatAvatarProps) {
  const src = new Avatar(gazeStyle, {
    seed,
    tags: [animated ? "animation" : "!animation"],
  }).toDataUri()

  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      // Inline SVG data URI: nothing for the optimizer to do, and SVG is blocked by default.
      unoptimized
      className={cn("size-8 shrink-0 rounded-full", className)}
    />
  )
}
