import type {
  EventApi,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import allLocales from "@fullcalendar/core/locales-all";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { BasesEntry, BasesPropertyId, DateValue, Value } from "obsidian";
import React, { useCallback, useRef } from "react";
import { useApp } from "./hooks";
import { formatTemplate, ResolvedCalendarLocale, translate } from "./locales";

interface CalendarReactViewProps {
  entries: CalendarEntry[];
  weekStartDay: number;
  locale: ResolvedCalendarLocale;
  properties: BasesPropertyId[];
  colorProperty: BasesPropertyId | null;
  defaultNoteColor: string;
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  onEventDrop?: (
    entry: BasesEntry,
    newStart: Date,
    newEnd?: Date,
  ) => Promise<void>;
  onAddNote: (date: Date) => void;
  addNoteEnabled: boolean;
  editable: boolean;
}

export const CalendarReactView: React.FC<CalendarReactViewProps> = ({
  entries,
  weekStartDay,
  locale,
  properties,
  colorProperty,
  defaultNoteColor,
  onEntryClick,
  onEntryContextMenu,
  onEventDrop,
  onAddNote,
  addNoteEnabled,
  editable,
}) => {
  const app = useApp();
  const calendarRef = useRef<FullCalendar>(null);

  const events = entries.map((calEntry) => {
    // FullCalendar treats end dates as exclusive when allDay is true
    // We need to add one day to the end date to make it inclusive
    // But if start and end are the same day, we don't set an end date (single day event)
    let adjustedEndDate = calEntry.endDate;
    if (calEntry.endDate) {
      const startDateOnly = new Date(
        calEntry.startDate.getFullYear(),
        calEntry.startDate.getMonth(),
        calEntry.startDate.getDate(),
      );
      const endDateOnly = new Date(
        calEntry.endDate.getFullYear(),
        calEntry.endDate.getMonth(),
        calEntry.endDate.getDate(),
      );

      if (startDateOnly.getTime() === endDateOnly.getTime()) {
        // Same day event - don't set end date to avoid showing as multi-day
        adjustedEndDate = undefined;
      } else {
        // Multi-day event - add one day to make end date inclusive
        adjustedEndDate = new Date(calEntry.endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
      }
    }

    const eventColor = resolveEventColor(
      calEntry.entry,
      colorProperty,
      defaultNoteColor,
    );

    return {
      id: calEntry.entry.file.path,
      title: calEntry.entry.file.basename,
      start: calEntry.startDate,
      end: adjustedEndDate,
      backgroundColor: eventColor || undefined,
      borderColor: eventColor || undefined,
      textColor: eventColor ? getReadableTextColor(eventColor) : undefined,
      allDay: true,
      extendedProps: {
        entry: calEntry.entry,
        originalEndDate: calEntry.endDate, // Keep track of original end date for drag operations
      },
    };
  });

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      clickInfo.jsEvent.preventDefault();
      const entry = clickInfo.event.extendedProps.entry as BasesEntry;
      const isModEvent = clickInfo.jsEvent.ctrlKey || clickInfo.jsEvent.metaKey;
      onEntryClick(entry, isModEvent);
    },
    [onEntryClick],
  );

  const handleEventMouseEnter = useCallback(
    (mouseEnterInfo: { event: EventApi; el: HTMLElement; jsEvent: MouseEvent }) => {
      const entry = mouseEnterInfo.event.extendedProps.entry as BasesEntry;

      if (app) {
        app.workspace.trigger("hover-link", {
          event: mouseEnterInfo.jsEvent,
          source: "bases",
          hoverParent: app.renderContext,
          targetEl: mouseEnterInfo.el,
          linktext: entry.file.path,
        });
      }

      const contextMenuHandler = (evt: Event) => {
        evt.preventDefault();
        // Create minimal event object for compatibility
        const syntheticEvent = {
          nativeEvent: evt as MouseEvent,
          currentTarget: mouseEnterInfo.el,
          target: evt.target as HTMLElement,
          preventDefault: () => evt.preventDefault(),
          stopPropagation: () => evt.stopPropagation(),
        } as unknown as React.MouseEvent;
        onEntryContextMenu(syntheticEvent, entry);
      };

      mouseEnterInfo.el.addEventListener("contextmenu", contextMenuHandler, {
        once: true,
      });
    },
    [app, onEntryContextMenu],
  );

  const handleEventDrop = useCallback(
    async (dropInfo: EventDropArg) => {
      if (!onEventDrop) {
        dropInfo.revert();
        return;
      }

      const entry = dropInfo.event.extendedProps.entry as BasesEntry;
      const originalEndDate = dropInfo.event.extendedProps.originalEndDate as
        | Date
        | undefined;
      const newStart = dropInfo.event.start;
      const newEnd = dropInfo.event.end;

      if (!newStart) {
        dropInfo.revert();
        return;
      }

      // Calculate the actual end date to save
      let actualEndDate: Date | undefined = undefined;
      if (originalEndDate) {
        if (newEnd) {
          // FullCalendar gave us an adjusted end date, we need to subtract one day to get the actual end date
          actualEndDate = new Date(newEnd);
          actualEndDate.setDate(actualEndDate.getDate() - 1);
        } else {
          // Single day event - use the start date as the end date
          actualEndDate = new Date(newStart);
        }
      }

      try {
        await onEventDrop(entry, newStart, actualEndDate);
      } catch {
        dropInfo.revert();
      }
    },
    [onEventDrop],
  );

  const handleDayCellDidMount = useCallback(
    (info: { el: HTMLElement; date: Date }) => {
      if (!addNoteEnabled) {
        return;
      }

      const dayTop = info.el.querySelector(".fc-daygrid-day-top");
      if (!(dayTop instanceof HTMLElement)) {
        return;
      }

      if (dayTop.querySelector(".bases-calendar-day-add")) {
        return;
      }

      const addButton = document.createElement("button");
      const addTooltip = translate(locale, "createNoteTooltip")
      addButton.type = "button";
      addButton.className = "bases-calendar-day-add";
      addButton.setAttribute("aria-label", addTooltip);
      addButton.textContent = "+";
      addButton.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        onAddNote(info.date);
      });
      dayTop.appendChild(addButton);
    },
    [addNoteEnabled, locale, onAddNote],
  );

  const hasNonEmptyValue = useCallback((value: Value): boolean => {
    if (!value || !value.isTruthy()) return false;
    const str = value.toString();
    return Boolean(str && str.trim().length > 0);
  }, []);

  const PropertyValue: React.FC<{ value: Value }> = ({ value }) => {
    const elementRef = useCallback(
      (node: HTMLElement | null) => {
        if (node && app) {
          // Remove previous content (due to React strict mode causing double calls)
          while (node.firstChild) {
            node.removeChild(node.firstChild);
          }

          if (!(value instanceof DateValue)) {
            value.renderTo(node, app.renderContext);
            return;
          }

          // Special handling for DateValue to show in a more compact format
          if ("date" in value && value.date && value.date instanceof Date) {
            if ("time" in value && value.time) {
              node.appendChild(
                document.createTextNode(
                  value.date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ),
              );
            } else {
              node.appendChild(
                document.createTextNode(
                  value.date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }),
                ),
              );
            }

            return;
          }
        }
      },
      [value],
    );

    return <span ref={elementRef} />;
  };

  const renderEventContent = useCallback(
    (eventInfo: EventContentArg) => {
      if (!app) return null;

      const entry = eventInfo.event.extendedProps.entry as BasesEntry;
      const validProperties: { propertyId: BasesPropertyId; value: Value }[] =
        [];
      for (const prop of properties) {
        const value = tryGetValue(entry, prop);
        if (value && hasNonEmptyValue(value)) {
          validProperties.push({ propertyId: prop, value });
        }
      }

      if (validProperties.length > 0) {
        const firstProperty = validProperties[0];
        const remainingProperties = validProperties.slice(1);

        return (
          <div className="bases-calendar-event-content">
            <div className="bases-calendar-event-title">
              <PropertyValue value={firstProperty.value} />
            </div>
            {remainingProperties.length > 0 && (
              <div className="bases-calendar-event-properties">
                {remainingProperties.map(({ propertyId: prop, value }) => (
                  <div key={prop} className="bases-calendar-event-property">
                    <span className="bases-calendar-event-property-value">
                      <PropertyValue value={value} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        // Fallback to file basename if no properties
        return (
          <div className="bases-calendar-event-content">
            <div className="bases-calendar-event-title">
              {entry.file.basename}
            </div>
          </div>
        );
      }
    },
    [properties, app, hasNonEmptyValue],
  );

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, interactionPlugin]}
      locales={allLocales}
      locale={locale}
      initialView="dayGridMonth"
      firstDay={weekStartDay}
      headerToolbar={{
        left: "",
        center: "title",
        right: "prev,today,next",
      }}
      titleFormat={(arg: { start: { year: number; month: number } }) =>
        formatMonthTitle(
          new Date(arg.start.year, arg.start.month, 1),
          locale,
        )
      }
      buttonText={{
        today: translate(locale, "today"),
      }}
      navLinks={false}
      events={events}
      dayCellDidMount={handleDayCellDidMount}
      eventContent={renderEventContent}
      eventClick={handleEventClick}
      eventMouseEnter={handleEventMouseEnter}
      eventDrop={(info) => void handleEventDrop(info)}
      height="auto"
      fixedWeekCount={true}
      fixedMirrorParent={document.body ?? undefined}
      eventDurationEditable={false}
      editable={editable}
    />
  );
};

interface CalendarEntry {
  entry: BasesEntry;
  startDate: Date;
  endDate?: Date;
}

function tryGetValue(entry: BasesEntry, propId: BasesPropertyId): Value | null {
  try {
    return entry.getValue(propId);
  } catch {
    return null;
  }
}

function resolveEventColor(
  entry: BasesEntry,
  colorProperty: BasesPropertyId | null,
  defaultNoteColor: string,
): string {
  const fromProperty = colorProperty ? tryGetValue(entry, colorProperty) : null;
  const colorValue = fromProperty?.toString().trim() || defaultNoteColor.trim();
  return isCssColor(colorValue) ? colorValue : "";
}

function isCssColor(value: string): boolean {
  if (!value) {
    return false;
  }

  const tester = document.createElement("span");
  tester.style.color = "";
  tester.style.color = value;
  return tester.style.color !== "";
}

function getReadableTextColor(backgroundColor: string): string {
  const normalized = normalizeColor(backgroundColor);
  if (!normalized) {
    return "var(--text-normal)";
  }

  const { r, g, b } = normalized;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 160 ? "#1f1f1f" : "#ffffff";
}

function normalizeColor(
  color: string,
): { r: number; g: number; b: number } | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = color;
  const computed = context.fillStyle;
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(computed);
  if (!hexMatch) {
    return null;
  }

  const hex = hexMatch[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function formatMonthTitle(date: Date, locale: ResolvedCalendarLocale): string {
  const month = date.toLocaleString(locale, { month: "long" });
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalizedMonth} ${date.getFullYear()}`;
}
