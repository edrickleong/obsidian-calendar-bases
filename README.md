## Obsidian Calendar Bases

![](./screenshot.png)

Adds a calendar layout to [Obsidian Bases](https://help.obsidian.md/bases) so you can display notes with dates in an interactive calendar view.

Built with [FullCalendar](https://github.com/fullcalendar/fullcalendar) for a robust and feature-rich calendar experience.

- Dynamically display entries that match your filters on their respective dates.
- Drag and drop events to reschedule them - automatically updates note frontmatter.
- Navigate between months with intuitive controls.
- Support for single-day and multi-day events (with optional end dates).
- Click entries to open them or use context menus for more options.

## Installation

This plugin currently required Obsidian v1.10.0 or later to work.

Obsidian v1.10.0 is currently in [Early Access](https://help.obsidian.md/early-access), so you will need a [Catalyst license](https://help.obsidian.md/catalyst) to use it.

### Install via BRAT

1. Install the [BRAT plugin](obsidian://show-plugin?id=obsidian42-brat) under Community Plugins.
2. Open BRAT settings and click "Add beta plugin".
3. Enter the URL of this repository: `https://github.com/edrickleong/obsidian-calendar-bases`.
4. Under "Select a version", choose the Latest version.
5. Click "Add plugin".

### Install via Community Plugins

Calendar Bases is not yet available under Community Plugins. It is currently being reviewed and should hopefully be available soon.

## Documentation

### Date Properties

To display entries on the calendar, configure a start date property in the view configuration menu. The property must contain a valid date string.

```yaml
# Date property examples
startDate: 2025-10-15
startDate: 2025-10-15T10:00:00

# Optional end date for multi-day events
endDate: 2025-10-18
```

Any JavaScript-parseable date format is supported. For multi-day events, configure both a start date and an optional end date property.

## Credits

This plugin uses [FullCalendar](https://github.com/fullcalendar/fullcalendar).

## License

This project is licensed under the MIT License.
