import React, { useState, useEffect, useCallback } from "react";
import { BasesEntry, Keymap, Menu } from "obsidian";
import { useApp } from "./hooks";

interface CalendarReactViewProps {
  entries: CalendarEntry[];
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  onEntryHover: (evt: React.MouseEvent, entry: BasesEntry) => void;
}

export const CalendarReactView: React.FC<CalendarReactViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  onEntryHover,
}) => {
  const app = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get entries for a specific date
  const getEntriesForDate = useCallback(
    (date: Date): CalendarEntry[] => {
      return entries.filter((calEntry) => {
        const entryDate = new Date(calEntry.startDate);
        entryDate.setHours(0, 0, 0, 0);

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        // Check if date matches start date
        if (isSameDay(entryDate, checkDate)) {
          return true;
        }

        // If there's an end date, check if date is in range
        if (calEntry.endDate) {
          const endDate = new Date(calEntry.endDate);
          endDate.setHours(0, 0, 0, 0);
          return checkDate >= entryDate && checkDate <= endDate;
        }

        return false;
      });
    },
    [entries],
  );

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1),
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (!selectedDate) return;

      let handled = false;
      const newDate = new Date(selectedDate);

      switch (evt.key) {
        case "ArrowLeft":
          newDate.setDate(newDate.getDate() - 1);
          handled = true;
          break;
        case "ArrowRight":
          newDate.setDate(newDate.getDate() + 1);
          handled = true;
          break;
        case "ArrowUp":
          newDate.setDate(newDate.getDate() - 7);
          handled = true;
          break;
        case "ArrowDown":
          newDate.setDate(newDate.getDate() + 7);
          handled = true;
          break;
        case "Enter":
          const dayEntries = getEntriesForDate(selectedDate);
          if (dayEntries.length > 0) {
            const isModEvent = evt.ctrlKey || evt.metaKey;
            onEntryClick(dayEntries[0].entry, isModEvent);
          }
          handled = true;
          break;
      }

      if (handled) {
        evt.preventDefault();
        setSelectedDate(newDate);

        // Navigate to month if date is in different month
        if (
          newDate.getMonth() !== currentDate.getMonth() ||
          newDate.getFullYear() !== currentDate.getFullYear()
        ) {
          setCurrentDate(
            new Date(newDate.getFullYear(), newDate.getMonth(), 1),
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDate, currentDate, getEntriesForDate, onEntryClick]);

  // Render calendar
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarDays: (Date | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  return (
    <div className="bases-calendar-react">
      {/* Header */}
      <div className="bases-calendar-header">
        <div className="bases-calendar-month-display">{monthName}</div>
        <button
          className="bases-calendar-nav-button"
          onClick={() => navigateMonth(-1)}
          aria-label="Previous month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button className="bases-calendar-today-button" onClick={goToToday}>
          Today
        </button>
        <button
          className="bases-calendar-nav-button"
          onClick={() => navigateMonth(1)}
          aria-label="Next month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="bases-calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div key={dayName} className="bases-calendar-day-header">
            {dayName}
          </div>
        ))}
        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="bases-calendar-day bases-calendar-day-empty"
              />
            );
          }

          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const dayEntries = getEntriesForDate(date);

          return (
            <div
              key={date.toISOString()}
              className={`bases-calendar-day ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="bases-calendar-day-number">{date.getDate()}</div>
              {dayEntries.length > 0 && (
                <div className="bases-calendar-day-entries">
                  {dayEntries.slice(0, 3).map((calEntry, i) => (
                    <div
                      key={`${calEntry.entry.file.path}-${i}`}
                      className="bases-calendar-entry"
                      onClick={(evt) => {
                        evt.stopPropagation();
                        const isModEvent = evt.ctrlKey || evt.metaKey;
                        onEntryClick(calEntry.entry, isModEvent);
                      }}
                      onContextMenu={(evt) => {
                        evt.stopPropagation();
                        onEntryContextMenu(evt, calEntry.entry);
                      }}
                      onMouseOver={(evt) => {
                        onEntryHover(evt, calEntry.entry);
                      }}
                    >
                      <div className="bases-calendar-entry-dot" />
                      <div className="bases-calendar-entry-title">
                        {calEntry.entry.file.basename}
                      </div>
                    </div>
                  ))}

                  {dayEntries.length > 3 && (
                    <div className="bases-calendar-more">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CalendarEntry {
  entry: BasesEntry;
  startDate: Date;
  endDate?: Date;
}
