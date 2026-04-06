import type {
  EventApi,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { BasesEntry, BasesPropertyId, DateValue, Value } from "obsidian";
import React, { useCallback, useEffect, useRef } from "react";

import { useApp } from "./hooks";

export interface CalendarHandle {
  updateSize(): void;
}

interface CalendarReactViewProps {
  entries: CalendarEntry[];
  weekStartDay: number;
  properties: BasesPropertyId[];
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  onEventDrop?: (
    entry: BasesEntry,
    newStart: Date,
    newEnd?: Date,
  ) => Promise<void>;
  editable: boolean;
  calendarHandleRef?: React.RefObject<CalendarHandle | null>;
}

export const CalendarReactView: React.FC<CalendarReactViewProps> = ({
  entries,
  weekStartDay,
  properties,
  onEntryClick,
  onEntryContextMenu,
  onEventDrop,
  editable,
  calendarHandleRef,
}) => {
  const app = useApp();
  const calendarRef = useRef<FullCalendar>(null);
  // Shared hover parent so Page Preview can manage popover lifecycle —
  // when a new popover opens, the old one on the same parent is dismissed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hoverParentRef = useRef<{ hoverPopover: any }>({ hoverPopover: null });

  // Expose updateSize to the parent view for resize/tab-switch handling
  useEffect(() => {
    if (calendarHandleRef) {
      (calendarHandleRef as React.RefObject<CalendarHandle | null>).current = {
        updateSize: () => calendarRef.current?.getApi().updateSize(),
      };
    }
    return () => {
      if (calendarHandleRef) {
        (calendarHandleRef as React.RefObject<CalendarHandle | null>).current = null;
      }
    };
  }, [calendarHandleRef]);

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

    return {
      id: calEntry.entry.file.path,
      title: calEntry.entry.file.basename,
      start: calEntry.startDate,
      end: adjustedEndDate,
      allDay: true,
      extendedProps: {
        entry: calEntry.entry,
        originalEndDate: calEntry.endDate, // Keep track of original end date for drag operations
      },
    };
  });

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const target = clickInfo.jsEvent.target as HTMLElement;
      const entry = clickInfo.event.extendedProps.entry as BasesEntry;
      const isModEvent = clickInfo.jsEvent.ctrlKey || clickInfo.jsEvent.metaKey;

      // Let interactive elements inside the event handle the click instead of opening the note
      const clickedTag = target.closest("a.tag");
      if (clickedTag) {
        return;
      }

      const clickedLink = target.closest(".internal-link") as HTMLElement | null;
      if (clickedLink) {
        return;
      }

      const clickedExternal = target.closest("a.external-link") as
        | HTMLAnchorElement
        | undefined;
      if (clickedExternal?.href) {
        return;
      }

      // Default: open the event's note
      clickInfo.jsEvent.preventDefault();
      onEntryClick(entry, isModEvent);
    },
    [app, onEntryClick],
  );

  const handleEventMouseEnter = useCallback(
    (mouseEnterInfo: { event: EventApi; el: HTMLElement; jsEvent: MouseEvent }) => {
      const entry = mouseEnterInfo.event.extendedProps.entry as BasesEntry;

      if (app) {
        app.workspace.trigger("hover-link", {
          event: mouseEnterInfo.jsEvent,
          source: "bases",
          hoverParent: hoverParentRef.current,
          targetEl: mouseEnterInfo.el,
          linktext: entry.file.path,
        });
      }

      const contextMenuHandler = (evt: Event) => {
        evt.preventDefault();
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
      initialView="dayGridMonth"
      firstDay={weekStartDay}
      headerToolbar={{
        left: "",
        center: "title",
        right: "prev,today,next",
      }}
      buttonText={{
        today: "Today",
      }}
      navLinks={false}
      events={events}
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
