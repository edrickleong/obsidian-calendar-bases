import {
  BasesEntry,
  BasesPropertyId,
  BasesView,
  Keymap,
  Menu,
  QueryController,
  ViewOption,
} from "obsidian";
import { StrictMode } from "react";
import { Root, createRoot } from "react-dom/client";
import { CalendarReactView } from "./CalendarReactView";
import { AppContext } from "./context";

export const CalendarViewType = "calendar";

const DEFAULT_CALENDAR_HEIGHT = 600;

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
    // Calendar auto-adjusts, no special handling needed
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

    this.containerEl.style.height = "";
  }

  private getNumericConfig(
    key: string,
    defaultValue: number,
    min?: number,
    max?: number,
  ): number {
    const value = this.config.get(key);
    if (!value || !Number.isNumber(value)) return defaultValue;

    let result = value;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }

  private isEmbedded(): boolean {
    let element = this.scrollEl.parentElement;
    while (element) {
      if (
        element.hasClass("bases-embed") ||
        element.hasClass("block-language-base")
      ) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  private updateCalendar(): void {
    if (!this.data || !this.startDateProp) {
      this.containerEl.empty();
      this.containerEl.createDiv("bases-calendar-empty").textContent =
        "Configure a start date property to display entries";
      return;
    }

    // Extract entries with dates
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

    // Render React calendar
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
            onEntryClick={(entry, isModEvent) => {
              void this.app.workspace.openLinkText(
                entry.file.path,
                "",
                isModEvent,
              );
            }}
            onEntryContextMenu={(evt, entry) => {
              evt.preventDefault();
              this.showEntryContextMenu(evt.nativeEvent as MouseEvent, entry);
            }}
            onEntryHover={(evt, entry) => {
              this.app.workspace.trigger("hover-link", {
                event: evt.nativeEvent,
                source: "bases",
                hoverParent: this.app.renderContext,
                targetEl: evt.currentTarget,
                linktext: entry.file.path,
              });
            }}
          />
        </AppContext.Provider>
      </StrictMode>,
    );
  }

  private extractDate(entry: BasesEntry, propId: BasesPropertyId): Date | null {
    try {
      const value = entry.getValue(propId);
      if (!value) return null;

      const dateString = value.toString().trim();
      if (!dateString) return null;

      // Parse various date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;

      return date;
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
        .setTitle("Delete file")
        .setIcon("lucide-trash-2")
        .setWarning(true)
        .onClick(() => this.app.fileManager.promptForDeletion(file)),
    );
  }

  public setEphemeralState(state: unknown): void {
    // State management could be extended for React component
  }

  public getEphemeralState(): unknown {
    return {};
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: "Date properties",
        type: "group",
        items: [
          {
            displayName: "Start date",
            type: "property",
            key: "startDate",
            filter: (prop) => !prop.startsWith("file."),
            placeholder: "Property",
          },
          {
            displayName: "End date (optional)",
            type: "property",
            key: "endDate",
            filter: (prop) => !prop.startsWith("file."),
            placeholder: "Property",
          },
        ],
      },
    ];
  }
}
