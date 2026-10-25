/** Eastern Arabic digits (١٢٣) for ayah, page and surah numbers. */
export function ar(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

export const pad3 = (n: number) => String(n).padStart(3, '0')

/** "سورة · ئایەت ٢" style references. */
export const ayahLabel = (surahName: string, ayah: number) => `${surahName} · ئایەت ${ar(ayah)}`

const fold: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ٲ': 'ا', 'ٳ': 'ا',
  'ى': 'ي', 'ی': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ک': 'ك', 'ة': 'ه', 'ە': 'ه', 'ۀ': 'ه', 'ہ': 'ه',
}

const dropped = /[ً-ٰٟؐ-ؚۖ-ۭـء‌-‏﻿]/

/**
 * Folds Arabic/Kurdish text for matching (same rules as the app and API):
 * no diacritics, one form of alef/ya/kaf/ha, single spaces. Also returns,
 * for every output character, its index in the original text.
 */
export function normalizeWithMap(text: string): [string, number[]] {
  let out = ''
  const map: number[] = []
  let lastSpace = true
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (dropped.test(c)) continue
    if (/\s/.test(c)) {
      if (!lastSpace) {
        out += ' '
        map.push(i)
        lastSpace = true
      }
      continue
    }
    out += (fold[c] ?? c).toLowerCase()
    map.push(i)
    lastSpace = false
  }
  if (out.endsWith(' ')) {
    out = out.slice(0, -1)
    map.pop()
  }
  return [out, map]
}

export const normalize = (text: string) => normalizeWithMap(text)[0]

/** The words of a search query to highlight: no "quotes" or -excluded words. */
export function queryWords(query: string): string[] {
  const words: string[] = []
  const phrase = query.match(/["«“]([^"»”]+)["»”]/)
  if (phrase) words.push(normalize(phrase[1]))
  const rest = phrase ? query.replace(phrase[0], ' ') : query
  for (const w of normalize(rest).split(' ')) if (w.length >= 2 && !w.startsWith('-')) words.push(w)
  return words
}

/** Character ranges in `text` matching the words (or phrase) of `query`, merged. */
export function matchRanges(text: string, query: string | string[]): [number, number][] {
  const [norm, map] = normalizeWithMap(text)
  const ranges: [number, number][] = []
  const words = typeof query === 'string' ? queryWords(query) : query.map(normalize)
  for (const w of words.filter((w) => w.length >= 2)) {
    let from = 0
    for (;;) {
      const i = norm.indexOf(w, from)
      if (i < 0) break
      let end = map[i + w.length - 1] + 1
      while (end < text.length && dropped.test(text[end])) end++
      ranges.push([map[i], end])
      from = i + w.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged
}
