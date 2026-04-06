	# Embedded Calendar Base
```base
views:
  - type: calendar
    name: Calendar
    order:
      - file.name
      - date
      - endDate
    startDate: note.date
    endDate: note.endDate

```

## Regular Markdown Table

| Name | Date | Status |
| --- | --- | --- |
| Project Alpha | 2026-04-01 | Active |
| Project Beta | 2026-04-15 | Pending |
| Project Gamma | 2026-05-01 | Complete |
