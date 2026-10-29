import type { Member } from '../domain/model'
// ColorArchive Jazz Club: https://colorarchive.org/collections/jazz-club/
export const jazzPalette = {
  amber: '#6E6121', taupe: '#AB9387', sage: '#A5AB87',
  shadow: '#4C4743', ivory: '#FAFAF9', copper: '#BC6438'
} as const
export const jazzCoverColors = [jazzPalette.amber, jazzPalette.shadow, jazzPalette.copper, jazzPalette.taupe, jazzPalette.sage, jazzPalette.shadow]
export const jazzNight = {
 background: '#1C1713', surface: '#302720', text: '#F3EADD', muted: '#C6B7A5',
 brass: '#DFD6A9', copper: '#DAB09B', sage: '#BBC29A', taupe: '#C7B7A7'
} as const
// Lighter counterparts of the amber, shadow, copper and sage avatar fills.
export const jazzPlotColors = [jazzNight.brass, jazzNight.taupe, jazzNight.copper, jazzNight.sage]
export function themeMembers(members: Member[]) {
  const colors = [jazzPalette.amber, jazzPalette.shadow, jazzPalette.copper, jazzPalette.sage]
  return members.map((member, index) => ({...member, color: jazzPlotColors[index % jazzPlotColors.length], avatarColor: colors[index % colors.length], textColor: index % colors.length === 3 ? jazzPalette.shadow : jazzPalette.ivory}))
}
