# uwaterloo-schedule-exporter

![icon](https://cloud.githubusercontent.com/assets/7663987/9626057/a1ad3ef8-510f-11e5-9f85-4b16138bdffe.png)

Export your University of Waterloo class schedule directly from [Quest.](https://uwaterloo.ca/quest/)

This is a fork of a fork meant to create multiple different calendars for each type of calendar event (e.g. lectures, tutorials, labs, etc) instead of just pulling everything into one calendar.

Original: https://github.com/bhamodi/uwaterloo-schedule-exporter
Forked version: https://github.com/Xierumeng/uwaterloo-schedule-exporter

## Usage

1. Clone this repository using:

```bash
$ git clone https://github.com/Leg3ndary/uwaterloo-schedule-exporter.git
```

2. Go to `chrome://extensions` in your Chrome browser, make sure `Developer mode` is checked, and click `Load unpacked extension...`. Select the directory where you cloned this repository.

3. Go to Class Schedule, select the term, then select Weekly Calendar View and return to List View. Switching back and forth is required to load the document so the extension can recognize this event.

4. Download whichever calendar you want as separate ical files.