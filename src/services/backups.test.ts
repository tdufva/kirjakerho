import { it, expect } from 'vitest'
import { demoArchive } from '../data/demo'
import { createBackup, readBackup, validateArchive } from './backups'
it('accepts current legacy backups and verifies a new backup checksum', async () => {
  const a = demoArchive()
  expect(validateArchive(a)).toEqual(a)
  expect((await readBackup(new File([JSON.stringify(a)], 'legacy.json'))).verified).toBe(false)
  const backup = await createBackup(a)
  expect((await readBackup(new File([JSON.stringify(backup)], 'new.json'))).archive).toEqual(a)
  backup.archive.works[0].title = 'Changed'
  await expect(readBackup(new File([JSON.stringify(backup)], 'changed.json'))).rejects.toThrow(
    'tarkistussumma'
  )
})
it('rejects broken relationships, duplicate IDs, unsupported versions, invalid scales and unsafe links', () => {
  for (const mutate of [
    (a: ReturnType<typeof demoArchive>) => {
      a.members[1].id = a.members[0].id
    },
    (a: ReturnType<typeof demoArchive>) => {
      a.works[0].ratings[0].memberId = 'missing'
    },
    (a: ReturnType<typeof demoArchive>) => {
      a.works[0].ratings[0].value = 999
    },
    (a: ReturnType<typeof demoArchive>) => {
      a.works[0].metadata = {
        source: 'Finna',
        confidence: 1,
        retrievedAt: 'today',
        externalId: '1',
        url: 'javascript:alert(1)'
      }
    }
  ]) {
    const a = demoArchive()
    mutate(a)
    expect(() => validateArchive(a)).toThrow()
  }
  expect(() => validateArchive({ version: 2 })).toThrow()
})
it('rejects malformed JSON without changing the archive', async () => {
  await expect(readBackup(new File(['not JSON'], 'bad.json'))).rejects.toThrow('JSON')
  expect(() => validateArchive({ ...demoArchive(), works: [{ title: 'missing fields' }] })).toThrow()
})
