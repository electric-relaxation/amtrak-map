import { useMemo } from 'react';

type EastWestDirection = 'eastbound' | 'westbound';
type NorthSouthDirection = 'northbound' | 'southbound';

interface DirectionControlsProps {
  eastWestDirection: EastWestDirection;
  northSouthDirection: NorthSouthDirection;
  onEastWestChange: (direction: EastWestDirection) => void;
  onNorthSouthChange: (direction: NorthSouthDirection) => void;
  isDark?: boolean;
}

export default function DirectionControls({
  eastWestDirection,
  northSouthDirection,
  onEastWestChange,
  onNorthSouthChange,
  isDark = true,
}: DirectionControlsProps) {
  const colors = useMemo(() => ({
    text: isDark ? '#e5e7eb' : '#1f2937',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    buttonBg: isDark ? '#374151' : '#e5e7eb',
    buttonActiveBg: '#3b82f6',
    buttonText: isDark ? '#9ca3af' : '#6b7280',
    buttonActiveText: '#ffffff',
    groupBg: isDark ? '#1f2937' : '#f3f4f6',
    border: isDark ? '#4b5563' : '#d1d5db',
  }), [isDark]);

  const toggleGroupStyle: React.CSSProperties = {
    display: 'flex',
    borderRadius: 6,
    overflow: 'hidden',
    border: `1px solid ${colors.border}`,
  };

  const toggleButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: isActive ? colors.buttonActiveBg : colors.groupBg,
    color: isActive ? colors.buttonActiveText : colors.buttonText,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* East/West Routes */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 500,
          color: colors.textMuted,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          East/West Routes
        </label>
        <div style={toggleGroupStyle}>
          <button
            onClick={() => onEastWestChange('westbound')}
            style={toggleButtonStyle(eastWestDirection === 'westbound')}
          >
            ← Westbound
          </button>
          <button
            onClick={() => onEastWestChange('eastbound')}
            style={toggleButtonStyle(eastWestDirection === 'eastbound')}
          >
            Eastbound →
          </button>
        </div>
      </div>

      {/* North/South Routes */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 500,
          color: colors.textMuted,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          North/South Routes
        </label>
        <div style={toggleGroupStyle}>
          <button
            onClick={() => onNorthSouthChange('northbound')}
            style={toggleButtonStyle(northSouthDirection === 'northbound')}
          >
            ↑ Northbound
          </button>
          <button
            onClick={() => onNorthSouthChange('southbound')}
            style={toggleButtonStyle(northSouthDirection === 'southbound')}
          >
            Southbound ↓
          </button>
        </div>
      </div>
    </div>
  );
}
