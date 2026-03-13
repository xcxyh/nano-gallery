'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // 替换路径中的语言前缀
    const segments = pathname.split('/');
    if (segments[1] === 'zh' || segments[1] === 'en') {
      segments[1] = newLocale;
    }
    router.push(segments.join('/'));
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600 transition-colors">
        <Globe size={14} className="text-neutral-400" />
        <span className="text-xs text-neutral-300">
          {languages.find(l => l.code === locale)?.flag}
        </span>
      </button>
      <div className="absolute right-0 top-full mt-2 w-32 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-800 first:rounded-t-xl last:rounded-b-xl flex items-center gap-2 transition-colors ${
              locale === lang.code ? 'text-yellow-400' : 'text-neutral-300'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}