export type CalendarLocale = "auto" | "en" | "ru";
export type ResolvedCalendarLocale = Exclude<CalendarLocale, "auto">;

export interface CalendarStrings {
  viewName: string;
  dateProperties: string;
  startDate: string;
  endDate: string;
  colorProperty: string;
  calendarOptions: string;
  addNote: string;
  configureStartDate: string;
  createNoteFailed: string;
  createNoteNeedsTemplate: string;
  createNoteNeedsTemplater: string;
  createNoteTooltip: string;
  deleteFile: string;
  notesFolder: string;
  noteTemplate: string;
  colorProperty: string;
  defaultNoteColor: string;
  locale: string;
  russian: string;
  english: string;
  systemDefault: string;
  monday: string;
  sunday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  today: string;
  weekStartsOn: string;
}

export type CalendarStringKey = keyof CalendarStrings;
