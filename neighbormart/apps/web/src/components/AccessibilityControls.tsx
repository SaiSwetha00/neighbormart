import { useState, useEffect } from 'react';
import { Accessibility, Type, Contrast, Zap } from 'lucide-react';

const FONT_SIZES = [
  { label: 'S', value: '14px', key: 'small' },
  { label: 'M', value: '16px', key: 'medium' },
  { label: 'L', value: '18px', key: 'large' },
  { label: 'XL', value: '20px', key: 'xl' },
];

export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState('16px');
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const savedSize = localStorage.getItem('a11y-font-size') ?? '16px';
    const savedContrast = localStorage.getItem('a11y-high-contrast') === 'true';
    const savedMotion = localStorage.getItem('a11y-reduce-motion') === 'true';
    applyFontSize(savedSize);
    applyHighContrast(savedContrast);
    applyReduceMotion(savedMotion);
    setFontSize(savedSize);
    setHighContrast(savedContrast);
    setReduceMotion(savedMotion);
  }, []);

  const applyFontSize = (size: string) => {
    document.documentElement.style.fontSize = size;
    localStorage.setItem('a11y-font-size', size);
  };

  const applyHighContrast = (on: boolean) => {
    if (on) document.documentElement.classList.add('high-contrast');
    else document.documentElement.classList.remove('high-contrast');
    localStorage.setItem('a11y-high-contrast', String(on));
  };

  const applyReduceMotion = (on: boolean) => {
    if (on) document.documentElement.classList.add('reduce-motion');
    else document.documentElement.classList.remove('reduce-motion');
    localStorage.setItem('a11y-reduce-motion', String(on));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Accessibility settings"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Accessibility size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[220px] space-y-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accessibility</p>

            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5"><Type size={13} /> Font Size</p>
              <div className="flex gap-1">
                {FONT_SIZES.map(f => (
                  <button key={f.key} onClick={() => { setFontSize(f.value); applyFontSize(f.value); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${fontSize === f.value ? 'bg-[#1B4332] text-white border-[#1B4332]' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button onClick={() => { const n = !highContrast; setHighContrast(n); applyHighContrast(n); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${highContrast ? 'bg-[#1B4332] text-white border-[#1B4332]' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <span className="flex items-center gap-2"><Contrast size={14} /> High Contrast</span>
                <span className={`w-4 h-4 rounded-full border-2 ${highContrast ? 'bg-white border-white' : 'border-gray-400'}`} />
              </button>
            </div>

            <div>
              <button onClick={() => { const n = !reduceMotion; setReduceMotion(n); applyReduceMotion(n); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${reduceMotion ? 'bg-[#1B4332] text-white border-[#1B4332]' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <span className="flex items-center gap-2"><Zap size={14} /> Reduce Motion</span>
                <span className={`w-4 h-4 rounded-full border-2 ${reduceMotion ? 'bg-white border-white' : 'border-gray-400'}`} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
