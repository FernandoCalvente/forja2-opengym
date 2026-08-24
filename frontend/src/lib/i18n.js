// Tiny dependency-free i18n, trimmed to Spanish-only for Forja (originally supported 12
// languages — see lib/i18n.js.bak.orig and locales.other-langs-backup/ to restore them).
import { useSyncExternalStore } from 'react'

export const LANGS = { es: 'Español' }
export const INSTR_LANGS = ['es']
const DATE_LOCALES = { es: 'es-ES' }

const localePacks = import.meta.glob('../locales/*.js')
const instrPacks = import.meta.glob('../instr/*.js')

let lang = 'es'
let dict = {}
let instr = null
let version = 0
const subs = new Set()
const notify = () => { version++; subs.forEach(f => f()) }

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'es-ES'

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}
// Instructions for an exercise in the current language (English steps as fallback).
export const instrFor = ex => (instr && instr[ex.id]) || ex.st || []

export async function setLang(l) {
  if (!LANGS[l]) l = 'es'
  if (l === lang && version > 0) return
  lang = l
  try {
    dict = (await localePacks['../locales/' + l + '.js']()).default
    instr = (await instrPacks['../instr/' + l + '.js']()).default
  } catch (e) { dict = {}; instr = null }
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, () => version)
}
