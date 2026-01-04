import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DateControlsProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isDark?: boolean;
}

// Get the day of year (0-365) for a given date
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Create a date from day of year
function dateFromDayOfYear(dayOfYear: number, year: number): Date {
  const date = new Date(year, 0, 1);
  date.setDate(dayOfYear);
  return date;
}

// Get special dates for the current year
function getSpecialDates(year: number) {
  return {
    springEquinox: new Date(year, 2, 20), // March 20
    summerSolstice: new Date(year, 5, 21), // June 21
    fallEquinox: new Date(year, 8, 22), // September 22
    winterSolstice: new Date(year, 11, 21), // December 21
  };
}

export default function DateControls({ selectedDate, onDateChange, isDark = true }: DateControlsProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentYear = new Date().getFullYear();
  const year = currentYear; // Always use current year
  const dayOfYear = getDayOfYear(selectedDate);
  const specialDates = useMemo(() => getSpecialDates(year), [year]);

  // Date range for current year only
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  // Track button position for portal positioning
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Update button position when calendar opens
  useEffect(() => {
    if (isCalendarOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isCalendarOpen]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCalendarOpen]);

  // Color schemes for light and dark modes
  const colors = useMemo(() => ({
    text: isDark ? '#e5e7eb' : '#1f2937',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textSubtle: isDark ? '#6b7280' : '#9ca3af',
    inputBg: isDark ? '#374151' : '#f3f4f6',
    inputBorder: isDark ? '#4b5563' : '#d1d5db',
    buttonBg: isDark ? '#374151' : '#e5e7eb',
    buttonHover: isDark ? '#4b5563' : '#d1d5db',
    buttonText: isDark ? '#e5e7eb' : '#374151',
    sliderTrack: isDark ? '#374151' : '#d1d5db',
    calendarBg: isDark ? '#1f2937' : '#ffffff',
  }), [isDark]);

  // Check if current date matches a special date
  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDayOfYear = parseInt(e.target.value, 10);
    onDateChange(dateFromDayOfYear(newDayOfYear, year));
  }, [onDateChange, year]);

  const handleDaySelect = useCallback((date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsCalendarOpen(false);
    }
  }, [onDateChange]);

  const setToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const setSpecialDate = useCallback((date: Date) => {
    onDateChange(date);
  }, [onDateChange]);

  // Format date as "Mon DD" (e.g., "Jan 15")
  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const buttonStyle = (isActive: boolean, activeColor: string): React.CSSProperties => ({
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    backgroundColor: isActive ? activeColor : colors.buttonBg,
    color: isActive ? '#ffffff' : colors.buttonText,
  });

  // Custom CSS variables for react-day-picker theming
  const calendarStyle: React.CSSProperties = {
    '--rdp-accent-color': '#3b82f6',
    '--rdp-accent-background-color': isDark ? '#1e3a5f' : '#dbeafe',
    '--rdp-day-height': '32px',
    '--rdp-day-width': '32px',
    '--rdp-day_button-height': '32px',
    '--rdp-day_button-width': '32px',
    backgroundColor: colors.calendarBg,
    color: colors.text,
    padding: '8px',
    borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    height: 300,
    overflow: 'hidden',
  } as React.CSSProperties;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Day of year slider with date picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min="1"
            max="365"
            value={dayOfYear}
            onChange={handleSliderChange}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              cursor: 'pointer',
              accentColor: '#3b82f6',
            }}
          />
          <div style={{ position: 'relative' }}>
            <button
              ref={buttonRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 4,
                color: colors.text,
                minWidth: 60,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              {formattedDate}
            </button>
            {isCalendarOpen && buttonRect && createPortal(
              <div
                ref={calendarRef}
                style={{
                  position: 'fixed',
                  top: buttonRect.top - 308,
                  right: window.innerWidth - buttonRect.right,
                  zIndex: 10000,
                }}
              >
                <style>{`
                  @media (hover: hover) {
                    .rdp-day_button:hover:not([disabled]) {
                      background-color: ${isDark ? '#374151' : '#e5e7eb'} !important;
                      border-radius: 6px;
                    }
                    .rdp-button_previous:hover,
                    .rdp-button_next:hover {
                      background-color: ${isDark ? '#374151' : '#e5e7eb'} !important;
                      border-radius: 4px;
                    }
                  }
                  .rdp-day_button:focus,
                  .rdp-button_previous:focus,
                  .rdp-button_next:focus {
                    outline: none;
                  }
                `}</style>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  month={selectedDate}
                  onMonthChange={(month) => {
                    // Keep within current year
                    if (month.getFullYear() === year) {
                      onDateChange(month);
                    }
                  }}
                  startMonth={startOfYear}
                  endMonth={endOfYear}
                  disabled={{ before: startOfYear, after: endOfYear }}
                  fixedWeeks
                  showOutsideDays
                  style={calendarStyle}
                  classNames={{
                    today: 'rdp-today',
                  }}
                  modifiersStyles={{
                    outside: { opacity: 0.3 },
                  }}
                />
              </div>,
              document.body
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.textSubtle, paddingRight: 76 }}>
          <span>Jan</span>
          <span>Apr</span>
          <span>Jul</span>
          <span>Oct</span>
          <span>Dec</span>
        </div>
      </div>

      {/* Quick select buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          onClick={setToday}
          style={buttonStyle(isToday, '#2563eb')}
        >
          Today
        </button>
        <button
          onClick={() => setSpecialDate(specialDates.springEquinox)}
          style={buttonStyle(
            selectedDate.toDateString() === specialDates.springEquinox.toDateString(),
            '#16a34a'
          )}
          title="March 20 - Equal day and night"
        >
          Spring
        </button>
        <button
          onClick={() => setSpecialDate(specialDates.summerSolstice)}
          style={buttonStyle(
            selectedDate.toDateString() === specialDates.summerSolstice.toDateString(),
            '#ca8a04'
          )}
          title="June 21 - Longest day"
        >
          Summer
        </button>
        <button
          onClick={() => setSpecialDate(specialDates.fallEquinox)}
          style={buttonStyle(
            selectedDate.toDateString() === specialDates.fallEquinox.toDateString(),
            '#ea580c'
          )}
          title="September 22 - Equal day and night"
        >
          Fall
        </button>
        <button
          onClick={() => setSpecialDate(specialDates.winterSolstice)}
          style={buttonStyle(
            selectedDate.toDateString() === specialDates.winterSolstice.toDateString(),
            '#1e40af'
          )}
          title="December 21 - Shortest day"
        >
          Winter
        </button>
      </div>
    </div>
  );
}
