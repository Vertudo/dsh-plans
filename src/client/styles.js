/**
 * Injects the pane's stylesheet once per document.
 *
 * The bundle is JavaScript only, so the CSS travels as a string (`panel.css`
 * goes through the esbuild `text` loader) and lands in a single `<style>`
 * element. The id guards against a second copy after a hot reload: the old
 * element is replaced, never stacked.
 */
import css from './panel.css'

const STYLE_ID = 'dsh-plans-styles'

export function injectStyles() {
  if (typeof document === 'undefined' || document.head === null) return
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) existing.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.append(style)
}
