## Calendar view for Obsidian Bases

Adds a calendar layout to [Obsidian Bases](https://help.obsidian.md/bases) so you can display notes with dates in an interactive calendar view.

- Dynamically display entries that match your filters on their respective dates.
- Navigate between months with keyboard shortcuts.
- Support for single-day and multi-day events (with optional end dates).
- Click entries to open them or use context menus for more options.

### Date Properties

To display entries on the calendar, configure a start date property in the view configuration menu. The property must contain a valid date string.

```yaml
# Date property examples
startDate: 2025-10-15
startDate: "October 15, 2025"
startDate: 2025-10-15T10:00:00

# Optional end date for multi-day events
endDate: 2025-10-18
```

Any JavaScript-parseable date format is supported. For multi-day events, configure both a start date and an optional end date property.

### Navigation

- **Arrow keys**: Navigate between days (left/right) or weeks (up/down)
- **Enter**: Open the first entry for the selected date
- **Mouse**: Click any entry to open it, or click a day to select it
- **Today button**: Jump back to the current date

