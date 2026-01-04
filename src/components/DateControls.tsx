import { useMemo, useCallback, useRef } from 'react';

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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const year = currentYear; // Always use current year
  const dayOfYear = getDayOfYear(selectedDate);
  const specialDates = useMemo(() => getSpecialDates(year), [year]);

  // Min/max dates for current year only
  const minDate = `${year}-01-01`;
  const maxDate = `${year}-12-31`;

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

  const handleDateInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T12:00:00');
    if (!isNaN(newDate.getTime())) {
      onDateChange(newDate);
    }
  }, [onDateChange]);

  const openDatePicker = useCallback(() => {
    dateInputRef.current?.showPicker();
  }, []);

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

  // Format date for input[type="date"] - ensure it's in current year
  const dateInputValue = useMemo(() => {
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate, year]);

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
              onClick={openDatePicker}
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
            <input
              ref={dateInputRef}
              type="date"
              value={dateInputValue}
              min={minDate}
              max={maxDate}
              onChange={handleDateInputChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
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
