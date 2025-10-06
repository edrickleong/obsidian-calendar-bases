import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { BasesEntry, BasesPropertyId } from "obsidian";
import React, { useCallback, useRef } from "react";
import { useApp } from "./hooks";

interface CalendarReactViewProps {
  entries: CalendarEntry[];
  weekStartDay: number;
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  onEventDrop?: (
    entry: BasesEntry,
    newStart: Date,
    newEnd?: Date,
  ) => Promise<void>;
}

export const CalendarReactView: React.FC<CalendarReactViewProps> = ({
  entries,
  weekStartDay,
  onEntryClick,
  onEntryContextMenu,
  onEventDrop,
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
      clickInfo.jsEvent.preventDefault();
      const entry = clickInfo.event.extendedProps.entry as BasesEntry;
      const isModEvent = clickInfo.jsEvent.ctrlKey || clickInfo.jsEvent.metaKey;
      onEntryClick(entry, isModEvent);
    },
    [onEntryClick],
  );

  const handleEventMouseEnter = useCallback(
    (mouseEnterInfo: { event: any; el: HTMLElement; jsEvent: MouseEvent }) => {
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
      } catch (error) {
        dropInfo.revert();
      }
    },
    [onEventDrop],
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
      eventClick={handleEventClick}
      eventMouseEnter={handleEventMouseEnter}
      eventDrop={handleEventDrop}
      height="auto"
      fixedWeekCount={true}
      fixedMirrorParent={document.body ?? undefined}
      eventDurationEditable={false}
      editable={true}
    />
  );
};

interface CalendarEntry {
  entry: BasesEntry;
  startDate: Date;
  endDate?: Date;
}
