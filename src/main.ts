import { Plugin } from "obsidian";
import { CalendarView, CalendarViewType } from "./calendar-view";

export default class ObsidianCalendarPlugin extends Plugin {
  async onload() {
    this.registerBasesView(CalendarViewType, {
      name: "Calendar",
      icon: "lucide-calendar",
      factory: (controller, containerEl) =>
        new CalendarView(controller, containerEl),
      options: CalendarView.getViewOptions,
    });
  }

  onunload() {}
}
