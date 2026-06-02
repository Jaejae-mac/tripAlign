import type { ScheduleCategory } from '@/types/schedule.types'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'

// Lucide icon SVG paths (24×24 viewBox) per category — each element is self-contained with its own fill/stroke
const ICON_PATHS: Record<ScheduleCategory, string> = {
  food: [
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M7 2v20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  ].join(''),
  tour: [
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<circle cx="12" cy="13" r="3" fill="none" stroke="white" stroke-width="2"/>',
  ].join(''),
  stay: [
    '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M12 10v4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M2 18h20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  ].join(''),
  transport: [
    '<path d="M8 6v6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M15 6v6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M2 12h19.6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<circle cx="7" cy="18" r="2" fill="none" stroke="white" stroke-width="2"/>',
    '<circle cx="15" cy="18" r="2" fill="none" stroke="white" stroke-width="2"/>',
  ].join(''),
  shopping: [
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    '<line x1="3" y1="6" x2="21" y2="6" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M16 10a4 4 0 0 1-8 0" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  ].join(''),
  etc: [
    '<circle cx="12" cy="12" r="1.5" fill="white"/>',
    '<circle cx="19" cy="12" r="1.5" fill="white"/>',
    '<circle cx="5" cy="12" r="1.5" fill="white"/>',
  ].join(''),
}

/**
 * Google Maps marker icon with category-specific color and icon.
 * The Lucide icon (24×24) is scaled to 12×12 and placed in the upper portion of the pin.
 * The visit order number appears below the icon inside the pin circle.
 */
export function createCategoryMarkerIcon(
  category: ScheduleCategory,
  index: number
): google.maps.Icon {
  if (typeof google === 'undefined') {
    throw new Error('createCategoryMarkerIcon: Google Maps API is not loaded')
  }
  const color = CATEGORY_CONFIG[category].color
  const iconPaths = ICON_PATHS[category]
  const number = index + 1

  // translate(10,3) scale(0.5): centers the 24×24 icon as a 12×12 block at pin position (16,9)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">` +
    `<path d="M16,2 C8.5,2 2,8.5 2,16 C2,25.5 16,44 16,44 C16,44 30,25.5 30,16 C30,8.5 23.5,2 16,2 Z" fill="${color}"/>` +
    `<circle cx="16" cy="15" r="11" fill="white" opacity="0.15"/>` +
    `<g transform="translate(10,3) scale(0.5)">${iconPaths}</g>` +
    `<text x="16" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="white">${number}</text>` +
    `</svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(32, 44),
    anchor: new google.maps.Point(16, 44),
  }
}
