import {
  CalendarLocale,
  CalendarStringKey,
  CalendarStrings,
  ResolvedCalendarLocale,
} from "./types";

const enLocale: CalendarStrings = {
  viewName: "Calendar",
  dateProperties: "Date properties",
  startDate: "Start date",
  endDate: "End date (optional)",
  colorProperty: "Color property (optional)",
  calendarOptions: "Calendar options",
  addNote: "Add note",
  configureStartDate: "Configure a start date property to display entries",
  createNoteFailed: "Could not create the note",
  createNoteNeedsTemplate: "Select a template file to create notes",
  createNoteNeedsTemplater: "Templater must be installed and enabled to use note creation",
  createNoteTooltip: "Add note",
  deleteFile: "Delete file",
  notesFolder: "Notes folder",
  noteTemplate: "Template file",
  colorProperty: "Color property",
  defaultNoteColor: "Default note color",
  locale: "Language",
  russian: "Russian",
  english: "English",
  systemDefault: "System default",
  monday: "Monday",
  sunday: "Sunday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  today: "Today",
  weekStartsOn: "Week starts on",
};

const ruLocale: CalendarStrings = {
  viewName: "Календарь",
  dateProperties: "Свойства даты",
  startDate: "Дата начала",
  endDate: "Дата окончания (необязательно)",
  colorProperty: "Свойство цвета (необязательно)",
  calendarOptions: "Настройки календаря",
  addNote: "Добавить заметку",
  configureStartDate: "Настройте свойство даты начала, чтобы показать записи",
  createNoteFailed: "Не удалось создать заметку",
  createNoteNeedsTemplate: "Выберите файл шаблона для создания заметок",
  createNoteNeedsTemplater: "Для создания заметок нужен установленный и включённый Templater",
  createNoteTooltip: "Добавить заметку",
  deleteFile: "Удалить файл",
  notesFolder: "Папка для заметок",
  noteTemplate: "Файл шаблона",
  colorProperty: "Свойство цвета",
  defaultNoteColor: "Цвет заметок по умолчанию",
  locale: "Язык",
  russian: "Русский",
  english: "Английский",
  systemDefault: "Как в системе",
  monday: "Понедельник",
  sunday: "Воскресенье",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
  today: "Сегодня",
  weekStartsOn: "Начало недели",
};

const LOCALES: Record<ResolvedCalendarLocale, CalendarStrings> = {
  en: enLocale,
  ru: ruLocale,
};

export type {
  CalendarLocale,
  CalendarStringKey,
  CalendarStrings,
  ResolvedCalendarLocale,
} from "./types";

export function resolveLocale(
  locale: CalendarLocale,
): ResolvedCalendarLocale {
  if (locale !== "auto") {
    return locale;
  }

  const detectedLocale =
    typeof window !== "undefined"
      ? window.navigator.language.toLowerCase()
      : "en";

  if (detectedLocale.startsWith("ru")) {
    return "ru";
  }

  return "en";
}

export function getStrings(locale: CalendarLocale): CalendarStrings {
  return LOCALES[resolveLocale(locale)];
}

export function translate(
  locale: CalendarLocale,
  key: CalendarStringKey,
  vars?: Record<string, string | number>,
): string {
  return formatTemplate(getStrings(locale)[key], vars);
}

export function formatTemplate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) {
    return template;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, token: string) => {
    const value = vars[token];
    return value === undefined ? match : String(value);
  });
}
