import { useState, useMemo, ReactNode } from 'react';

interface ControlPanelProps {
  title: string;
  children: ReactNode;
  isDark?: boolean;
  defaultExpanded?: boolean;
}

export default function ControlPanel({
  title,
  children,
  isDark = true,
  defaultExpanded = true,
}: ControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colors = useMemo(() => ({
    bg: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    border: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.8)',
    shadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
    headerText: isDark ? '#e5e7eb' : '#1f2937',
    headerBg: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)',
    buttonHover: isDark ? '#4b5563' : '#e5e7eb',
  }), [isDark]);

  return (
    <div style={{
      backgroundColor: colors.bg,
      borderRadius: 8,
      boxShadow: colors.shadow,
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* Header with collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: colors.headerBg,
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
      >
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.headerText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 16,
          color: colors.headerText,
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▲
        </span>
      </button>

      {/* Content */}
      <div style={{
        maxHeight: isExpanded ? 500 : 0,
        opacity: isExpanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}>
        <div style={{ padding: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
