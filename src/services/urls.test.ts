import { describe, expect, it } from 'vitest'
import { appUrl } from './urls'

describe('GitHub project Pages links', () => {
  it('keeps work details under the repository path and out of server routes', () => {
    expect(appUrl('/teos/book-id', '/kirjakerho/', 'https://tdufva.github.io').href)
      .toBe('https://tdufva.github.io/kirjakerho/#/teos/book-id')
  })
  it('preserves invitation parameters without conflicting with the route fragment', () => {
    const url = appUrl('/asetukset', '/kirjakerho/', 'https://tdufva.github.io')
    url.searchParams.set('invitation', 'one-use-token')
    expect(url.pathname).toBe('/kirjakerho/')
    expect(url.hash).toBe('#/asetukset')
    expect(new URL(url.href).searchParams.get('invitation')).toBe('one-use-token')
  })
  it('also supports local root hosting', () => {
    expect(appUrl('/', '/', 'http://localhost:5173').href).toBe('http://localhost:5173/#/')
  })
})
