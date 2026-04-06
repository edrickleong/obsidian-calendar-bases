import {
  BasesAllOptions,
  BasesEntry,
  BasesPropertyId,
  BasesView,
  DateValue,
  Menu,
  Notice,
  parsePropertyId,
  QueryController,
  TFile,
} from "obsidian";
import { StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { CalendarReactView } from "./CalendarReactView";
import { AppContext } from "./context";
import { createNoteForDate } from "./note-creation";
import {
  CalendarLocale,
  resolveLocale,
  translate,
} from "./locales";

export const CalendarViewType = "calendar";

interface CalendarEntry {
  entry: BasesEntry;
  startDate: Date;
  endDate?: Date;
}

export class CalendarView extends BasesView {
  type = CalendarViewType;
  scrollEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | null = null;

  // Internal rendering data
  private entries: CalendarEntry[] = [];
  private startDateProp: BasesPropertyId | null = null;
  private endDateProp: BasesPropertyId | null = null;
  private weekStartDay: number = 1;
  private locale: CalendarLocale = "auto";
  private notesFolder = "";
  private noteTemplate = "";
  private colorProperty: BasesPropertyId | null = null;
  private defaultNoteColor = "";

  constructor(controller: QueryController, scrollEl: HTMLElement) {
    super(controller);
    this.scrollEl = scrollEl;
    this.containerEl = scrollEl.createDiv({
      cls: "bases-calendar-container is-loading",
      attr: { tabIndex: 0 },
    });
  }

  onload(): void {
    // React components will handle their own lifecycle
  }

  onunload() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.entries = [];
  }

  onResize(): void {
    // TODO: Find a better way to handle resizing
    this.updateCalendar();
  }

  public focus(): void {
    this.containerEl.focus({ preventScroll: true });
  }

  public onDataUpdated(): void {
    this.containerEl.removeClass("is-loading");
    this.loadConfig();
    this.updateCalendar();
  }

  private loadConfig(): void {
    this.startDateProp = this.config.getAsPropertyId("startDate");
    this.endDateProp = this.config.getAsPropertyId("endDate");
    this.colorProperty = this.config.getAsPropertyId("colorProperty");
    const weekStartDayValue = this.config.get("weekStartDay") as string;
    this.locale = (this.config.get("locale") as CalendarLocale) || "auto";
    this.notesFolder = ((this.config.get("notesFolder") as string) || "").trim();
    this.noteTemplate = ((this.config.get("noteTemplate") as string) || "").trim();
    this.defaultNoteColor = ((this.config.get("defaultNoteColor") as string) || "").trim();

    const dayNameToNumber: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    this.weekStartDay = weekStartDayValue
      ? (dayNameToNumber[weekStartDayValue] ?? 1)
      : 1; // Default to Monday
  }

  private updateCalendar(): void {
    if (!this.data || !this.startDateProp) {
      this.root?.unmount();
      this.root = null;
      this.containerEl.empty();
      this.containerEl.createDiv("bases-calendar-empty").textContent =
        translate(this.locale, "configureStartDate");
      return;
    }

    this.entries = [];
    for (const entry of this.data.data) {
      const startDate = this.extractDate(entry, this.startDateProp);
      if (startDate) {
        const endDate = this.endDateProp
          ? (this.extractDate(entry, this.endDateProp) ?? undefined)
          : undefined;
        this.entries.push({
          entry,
          startDate,
          endDate,
        });
      }
    }

    this.renderReactCalendar();
  }

  private renderReactCalendar(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl);
    }

    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <CalendarReactView
            entries={this.entries}
            weekStartDay={this.weekStartDay}
            locale={resolveLocale(this.locale)}
            properties={this.config.getOrder() || []}
            colorProperty={this.colorProperty}
            defaultNoteColor={this.defaultNoteColor}
            onEntryClick={(entry, isModEvent) => {
              void this.app.workspace.openLinkText(
                entry.file.path,
                "",
                isModEvent,
              );
            }}
            onEntryContextMenu={(evt, entry) => {
              evt.preventDefault();
              this.showEntryContextMenu(evt.nativeEvent, entry);
            }}
            onEventDrop={(entry, newStart, newEnd) =>
              this.updateEntryDates(entry, newStart, newEnd)
            }
            onAddNote={(date) => void this.createNote(date)}
            addNoteEnabled={this.canCreateNotes()}
            editable={this.isEditable()}
          />
        </AppContext.Provider>
      </StrictMode>,
    );
  }

  private canCreateNotes(): boolean {
    if (!this.startDateProp) {
      return false;
    }

    const startDateProperty = parsePropertyId(this.startDateProp);
    return startDateProperty.type === "note";
  }

  private isEditable(): boolean {
    if (!this.startDateProp) return false;
    const startDateProperty = parsePropertyId(this.startDateProp);
    if (startDateProperty.type !== "note") return false;

    if (!this.endDateProp) return true;
    const endDateProperty = parsePropertyId(this.endDateProp);
    if (endDateProperty.type !== "note") return false;

    return true;
  }

  private extractDate(entry: BasesEntry, propId: BasesPropertyId): Date | null {
    try {
      const value = entry.getValue(propId);
      if (!value) return null;
      if (!(value instanceof DateValue)) return null;
      // Private API
      if ("date" in value && value.date && value.date instanceof Date) {
        return value.date;
      }

      return null;
    } catch (error) {
      console.error(`Error extracting date for ${entry.file.name}:`, error);
      return null;
    }
  }

  private showEntryContextMenu(evt: MouseEvent, entry: BasesEntry): void {
    const file = entry.file;
    const menu = Menu.forEvent(evt);

    this.app.workspace.handleLinkContextMenu(menu, file.path, "");

    menu.addItem((item) =>
      item
        .setSection("danger")
        .setTitle(translate(this.locale, "deleteFile"))
        .setIcon("lucide-trash-2")
        .setWarning(true)
        .onClick(() => this.app.fileManager.promptForDeletion(file)),
    );
  }

  private async createNote(date: Date): Promise<void> {
    if (!this.startDateProp || !this.canCreateNotes()) {
      return;
    }

    if (!this.noteTemplate) {
      new Notice(translate(this.locale, "createNoteNeedsTemplate"));
      return;
    }

    await createNoteForDate(this.app, {
      folderPath: this.notesFolder,
      templatePath: this.noteTemplate,
      date,
      startDateProp: this.startDateProp,
      createNoteFailedMessage: translate(this.locale, "createNoteFailed"),
      createNoteNeedsTemplaterMessage: translate(
        this.locale,
        "createNoteNeedsTemplater",
      ),
    });
  }

  private async updateEntryDates(
    entry: BasesEntry,
    newStart: Date,
    newEnd?: Date,
  ): Promise<void> {
    if (!this.startDateProp) return;

    const file = entry.file;
    const startPropName = this.startDateProp;
    const endPropName = this.endDateProp;

    const extractedStartProp = startPropName.startsWith("note.")
      ? startPropName.slice(5)
      : null;

    const extractedEndProp = endPropName?.startsWith("note.")
      ? endPropName.slice(5)
      : null;

    const shouldUpdate =
      extractedStartProp !== null &&
      (!this.endDateProp || extractedEndProp !== null);

    if (!shouldUpdate) {
      return;
    }

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      frontmatter[extractedStartProp] = formatDate(newStart);
      if (this.endDateProp && newEnd && extractedEndProp) {
        frontmatter[extractedEndProp] = formatDate(newEnd);
      }
    });
  }

  public setEphemeralState(state: unknown): void {
    // State management could be extended for React component
  }

  public getEphemeralState(): unknown {
    return {};
  }

  static getViewOptions(): BasesAllOptions[] {
    return [
      {
        displayName: translate("auto", "dateProperties"),
        type: "group",
        items: [
          {
            displayName: translate("auto", "startDate"),
            type: "property",
            key: "startDate",
            placeholder: "Property",
          },
          {
            displayName: translate("auto", "endDate"),
            type: "property",
            key: "endDate",
            placeholder: "Property",
          },
          {
            displayName: translate("auto", "colorProperty"),
            type: "property",
            key: "colorProperty",
            placeholder: "Property",
          },
        ],
      },
      {
        displayName: translate("auto", "calendarOptions"),
        type: "group",
        items: [
          {
            displayName: translate("auto", "locale"),
            type: "dropdown",
            key: "locale",
            default: "auto",
            options: {
              auto: translate("auto", "systemDefault"),
              en: translate("auto", "english"),
              ru: translate("auto", "russian"),
            },
          },
          {
            displayName: translate("auto", "weekStartsOn"),
            type: "dropdown",
            key: "weekStartDay",
            default: "monday",
            options: {
              sunday: translate("auto", "sunday"),
              monday: translate("auto", "monday"),
              tuesday: translate("auto", "tuesday"),
              wednesday: translate("auto", "wednesday"),
              thursday: translate("auto", "thursday"),
              friday: translate("auto", "friday"),
              saturday: translate("auto", "saturday"),
            },
          },
          {
            displayName: translate("auto", "notesFolder"),
            type: "folder",
            key: "notesFolder",
            placeholder: "Daily notes/Calendar",
          },
          {
            displayName: translate("auto", "noteTemplate"),
            type: "file",
            key: "noteTemplate",
            placeholder: "Templates/Daily note.md",
            filter: (file: TFile) => file.extension === "md",
          },
          {
            displayName: translate("auto", "defaultNoteColor"),
            type: "text",
            key: "defaultNoteColor",
            placeholder: "#7f56d9",
          },
        ],
      },
    ];
  }
}
