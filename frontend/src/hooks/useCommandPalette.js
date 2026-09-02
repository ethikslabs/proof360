// The palette's keybinding, in its own file so CommandPalette.jsx exports components
// only and fast refresh keeps working.
import { useEffect, useState } from 'react';

/** ⌘K / Ctrl-K, and nothing else — a palette that steals more keys than that is a bug. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen, close: () => setOpen(false) };
}


export default useCommandPalette;
