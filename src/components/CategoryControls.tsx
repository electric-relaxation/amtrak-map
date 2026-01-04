import { useMemo } from 'react';
import type { CategoryVisibility } from '../types';

type VisibleCategory = keyof CategoryVisibility;

interface CategoryControlsProps {
  categoryVisibility: CategoryVisibility;
  onToggle: (category: VisibleCategory) => void;
  isDark?: boolean;
}

const CATEGORIES: { key: VisibleCategory; label: string }[] = [
  { key: 'Long-Distance', label: 'Long-Distance' },
  { key: 'State-Supported', label: 'State-Supported' },
  { key: 'Northeast Corridor', label: 'Northeast Corridor' },
];

export default function CategoryControls({
  categoryVisibility,
  onToggle,
  isDark = true,
}: CategoryControlsProps) {
  const colors = useMemo(() => ({
    text: isDark ? '#e5e7eb' : '#1f2937',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    checkboxBg: isDark ? '#374151' : '#f3f4f6',
    checkboxBorder: isDark ? '#4b5563' : '#d1d5db',
    checkboxChecked: '#3b82f6',
  }), [isDark]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 500,
        color: colors.textMuted,
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        Route Categories
      </label>
      {CATEGORIES.map(({ key, label }) => (
        <label
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 13,
            color: colors.text,
          }}
        >
          <input
            type="checkbox"
            checked={categoryVisibility[key]}
            onChange={() => onToggle(key)}
            style={{
              width: 16,
              height: 16,
              cursor: 'pointer',
              accentColor: colors.checkboxChecked,
            }}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
