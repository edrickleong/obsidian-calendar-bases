# Example Usage: Color Property

This document demonstrates how to use the color property feature in Calendar Bases.

## Setting Up

1. Create a new Base in Obsidian
2. Add a Calendar view to your Base
3. Configure the following properties in the view settings:
   - **Start date**: Select the property that contains your dates
   - **Color property (optional)**: Select the property that contains color values

## Example Notes

Here are some example notes that demonstrate different color values:

### Event 1: Meeting
```markdown
---
startDate: 2025-10-15
color: red
---

# Team Meeting
Quarterly planning session
```

### Event 2: Birthday Party
```markdown
---
startDate: 2025-10-16
color: #FF69B4
---

# Birthday Party
Celebrate Sarah's birthday
```

### Event 3: Conference
```markdown
---
startDate: 2025-10-18
endDate: 2025-10-20
color: #4169E1
---

# Tech Conference
Multi-day technology conference
```

### Event 4: Workshop
```markdown
---
startDate: 2025-10-22
color: green
---

# Design Workshop
Learn about UX principles
```

## Color Format Examples

### CSS Color Names
Any valid CSS color name is supported:
- `red`, `blue`, `green`, `yellow`
- `orange`, `purple`, `pink`, `brown`
- `navy`, `teal`, `lime`, `maroon`

### Hex Color Codes
Hex codes are supported in the following formats:
- **3-digit**: `#F00` (short form of #FF0000)
- **6-digit**: `#FF5733` (standard RGB)
- **8-digit**: `#FF5733AA` (RGB with alpha/transparency)

## Tips

- Use consistent colors for event categories (e.g., all work events in blue, personal in green)
- Consider using lighter colors for better readability
- If a note doesn't have a color property, it will use the default calendar color
- Invalid color values will be ignored and fall back to the default color
