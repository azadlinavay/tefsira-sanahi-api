import { Sheet } from './ui'

const KEYS: [string, string][] = [
  ['← / →', 'لاپەرێ پاشتر / پێشتر'],
  ['↓ / ↑  یان  J / K', 'ئایەتا پاشتر / پێشتر'],
  ['Space', 'خواندن / ڕاوەستاندن'],
  ['+ / −', 'مەزنکرن / بچووککرنا نڤیسینێ'],
  ['Ctrl + Scroll', 'مەزنکرنا نڤیسینێ'],
  ['S', 'هەلبژارتنا سورەتێ'],
  ['T', 'مسحەف، ڕەنگ و ڕێنڤیس'],
  ['F', 'هەمی شاشە'],
  ['/', 'لێگەریان'],
  ['Esc', 'گرتنا پەنجەرێ'],
  ['?', 'ئەڤ لیستە'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} dialog label="کورتەڕێکێن کیبۆردی">
      <h3 style={{ marginTop: 6 }}>کورتەڕێکێن کیبۆردی</h3>
      <table className="keys">
        <tbody>
          {KEYS.map(([k, what]) => (
            <tr key={k}>
              <td>
                <kbd dir="ltr">{k}</kbd>
              </td>
              <td>{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  )
}
