import type { Member } from '../domain/model'
// ColorArchive Jazz Club: https://colorarchive.org/collections/jazz-club/
export const jazzPalette = {
  amber: '#6E6121', taupe: '#AB9387', sage: '#A5AB87',
  shadow: '#4C4743', ivory: '#FAFAF9', copper: '#BC6438'
} as const
export const jazzCoverColors = [jazzPalette.amber, jazzPalette.shadow, jazzPalette.copper, jazzPalette.taupe, jazzPalette.sage, jazzPalette.shadow]
export function themeMembers(members: Member[]) {
  const colors = [jazzPalette.amber, jazzPalette.shadow, jazzPalette.copper, jazzPalette.sage]
  return members.map((member, index) => ({...member, color: colors[index % colors.length], textColor: index % colors.length === 3 ? jazzPalette.shadow : jazzPalette.ivory}))
}
