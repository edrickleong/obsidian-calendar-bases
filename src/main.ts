import { Plugin } from "obsidian";
import { CalendarView, CalendarViewType } from "./calendar-view";
import { translate } from "./locales";

export default class ObsidianCalendarPlugin extends Plugin {
  onload() {
    this.registerBasesView(CalendarViewType, {
      name: translate("auto", "viewName"),
      icon: "lucide-calendar",
      factory: (controller, containerEl) =>
        new CalendarView(controller, containerEl),
      options: () => CalendarView.getViewOptions(),
    });
  }

  onunload() {}
}
