/**
 * uWaterloo Schedule Exporter
 * (c) 2015-Present, Baraa Hamodi
 * (c) 2018-Present, Xierumeng with permission from Baraa Hamodi
 */

/**
 * Converts a Date object into the required calendar format.
 * @param {Object} date
 * @return {String} formatted date ('20150122')
 */
function getDateString(date) {
  let month = date.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  let day = date.getDate();
  if (day < 10) {
    day = "0" + day;
  }
  return "" + date.getFullYear() + month + day;
}

/**
 * Converts a time string into the required calendar format.
 * @param {String} time ('4:30PM')
 * @return {String} formatted time ('163000')
 */
function getTimeString(time) {
  let timeString = time;
  if (time.match(/[AP]M/)) {
    timeString = time.substr(0, time.length - 2);
  }
  let parts = timeString.split(":");
  if (parts[0].length !== 2) {
    parts[0] = "0" + parts[0];
  }
  timeString = parts.join("") + "00";
  if (time.match(/PM/) && parts[0] < 12) {
    timeString = (parseInt(timeString, 10) + 120000).toString();
  }
  return timeString;
}

/**
 * Combines date and time strings into the required calendar format.
 * @param {String} date ('20150122')
 * @param {String} time ('163000')
 * @return {String} formatted date and time string ('20150122T163000')
 */
function getDateTimeString(date, time) {
  return getDateString(date) + "T" + getTimeString(time);
}

/**
 * Combines days of the week that an event occurs into the required calendar format.
 * @param {String} daysOfWeek ('MTWThF')
 * @return {String} formatted days of the week string ('MO,TU,WE,TH,FR')
 */
function getDaysOfWeek(daysOfWeek) {
  let formattedDays = [];
  if (daysOfWeek.match(/S[^a]/)) {
    formattedDays.push("SU");
  }
  if (daysOfWeek.match(/M/)) {
    formattedDays.push("MO");
  }
  if (daysOfWeek.match(/T[^h]/)) {
    formattedDays.push("TU");
  }
  if (daysOfWeek.match(/W/)) {
    formattedDays.push("WE");
  }
  if (daysOfWeek.match(/Th/)) {
    formattedDays.push("TH");
  }
  if (daysOfWeek.match(/F/)) {
    formattedDays.push("FR");
  }
  if (daysOfWeek.match(/S[^u]/)) {
    formattedDays.push("SA");
  }

  return formattedDays.join(",");
}

/**
 * Increments starting date to match day of repeating event in RRULE.
 * @param {Object} date
 * @param {Array<String>} eventDays
 * @return {Object} date
 */
function incrementDateDay(date, eventDays) {
  let days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  // Increment the date until it matches one of the event days.
  let currentDay = days[date.getDay()];
  while (!eventDays.includes(currentDay)) {
    date.setDate(date.getDate() + 1);
    currentDay = days[date.getDay()];
  }
  return date;
}

/**
 * Wraps calendar event content into the required calendar format.
 * @param {String} iCalContent
 * @return {String} formatted calendar content
 */
function wrapICalContent(iCalContent) {
  return (
    "BEGIN:VCALENDAR\r\n" +
    "METHOD:PUBLISH\r\n" +
    "PRODID:-//Baraa Hamodi/uWaterloo Schedule Exporter//EN\r\n" +
    "VERSION:2.0\r\n" +
    "X-WR-CALNAME:UWQuest Export\r\n" +
    "X-WR-TIMEZONE:America/Toronto\r\n" +
    "BEGIN:VTIMEZONE\r\n" +
    "TZID:Eastern Standard Time\r\n" +
    "END:VTIMEZONE\r\n" +
    iCalContent +
    "END:VCALENDAR\r\n"
  );
}

/**
 * Makes a best effort to determine the locale of the browser.
 * navigator.languages[0] is more accurate, but only exists in Firefox and Chrome.
 * navigator.language is more supported, but less accurate.
 * See: http://stackoverflow.com/a/31135571
 * @return {String} browser's locale
 */
function getLocale() {
  if (navigator.languages != undefined) {
    return navigator.languages[0];
  } else {
    return navigator.language;
  }
}

/**
 * Extracts course schedule info and creates a downloadable iCalendar (.ics) file.
 */
let main = function () {
  let iCalContentLab = [];
  let iCalContentTut = [];
  let iCalContentLec = [];
  let iCalContentTst = [];
  let timezone = "America/Toronto";
  let numberOfEvents = 0;

  moment.locale(getLocale());

  $(".PSGROUPBOXWBO").each(function () {
    let eventTitle = $(this).find(".PAGROUPDIVIDER").text().split(" - ");
    let courseCode = eventTitle[0];
    let courseName = eventTitle[1];
    let componentRows = $(this).find(".PSLEVEL3GRID").find("tr");

    componentRows.each(function () {
      let classNumber = $(this)
        .find('span[id*="DERIVED_CLS_DTL_CLASS_NBR"]')
        .text();
      let section = $(this).find('a[id*="MTG_SECTION"]').text();
      let component = $(this).find('span[id*="MTG_COMP"]').text();

      let prev = $(this).prev();
      while (classNumber.length === 1) {
        classNumber = prev.find('span[id*="DERIVED_CLS_DTL_CLASS_NBR"]').text();
        section = prev.find('a[id*="MTG_SECTION"]').text();
        component = prev.find('span[id*="MTG_COMP"]').text();
        prev = prev.prev();
      }

      let daysTimes = $(this).find('span[id*="MTG_SCHED"]').text();
      let startEndTimes = daysTimes.match(/\d\d?:\d\d([AP]M)?/g);

      if (startEndTimes) {
        let daysOfWeek = getDaysOfWeek(daysTimes.match(/[A-Za-z]* /)[0]);
        let startTime = startEndTimes[0];
        let endTime = startEndTimes[1];

        let room = $(this).find('span[id*="MTG_LOC"]').text();
        let instructor = $(this)
          .find('span[id*="DERIVED_CLS_DTL_SSR_INSTR_LONG"]')
          .text();
        instructor = instructor.replace(/(\r\n|\n|\r)/gm, ""); // Strip any line breaks
        let startEndDate = $(this).find('span[id*="MTG_DATES"]').text();
        //alert(startEndDate); // Debugging
        //alert(startEndDate.substring(13, 23));

        // Increment the start date until its day matches one of the days in daysOfWeek.
        // This ensures an event does not occur on startDate if startDate is not on part of daysOfWeek.
        let startDate = moment(
          startEndDate.substring(0, 10),
          "MM/DD/YYYY"
        ).toDate();
        //startDate.setDate(startDate.getDate() - 1); // Start one day before the start date.
        let days = daysOfWeek.split(",");
        startDate = incrementDateDay(startDate, days);

        // End the event one day after the actual end date. Technically, the RRULE UNTIL field should
        // be the start time of the last occurrence of an event. However, since the field does not
        // accept a timezone (only UTC time) and America/Toronto is always behind UTC, we can just set the
        // end date one day after and be guaranteed of no other occurrence of this event.
        let endDate = moment(
          startEndDate.substring(13, 23),
          "MM/DD/YYYY"
        ).toDate();
        endDate.setDate(endDate.getDate() + 1);

        let iCalContent =
          "BEGIN:VEVENT\r\n" +
          "DTSTART;TZID=" +
          timezone +
          ":" +
          getDateTimeString(startDate, startTime) +
          "\r\n" +
          "DTEND;TZID=" +
          timezone +
          ":" +
          getDateTimeString(startDate, endTime) +
          "\r\n" +
          "RRULE:FREQ=WEEKLY;UNTIL=" +
          getDateTimeString(endDate, endTime) +
          "Z;BYDAY=" +
          daysOfWeek +
          ";\r\n" +
          "DTSTAMP:20180101T000000Z\r\n" +
          "UID:1" +
          Math.random().toString(36).replace("0.", "") +
          Math.random().toString(36).replace("0.", "") +
          Math.random().toString(36).replace("0.", "") +
          Math.random().toString(36).replace("0.", "") +
          "\r\n" +
          "CREATED:20180101T000000Z\r\n" +
          "DESCRIPTION:" +
          "Course Name: " +
          courseName +
          "\\n" +
          "Section: " +
          section +
          "\\n" +
          "Instructor: " +
          instructor +
          "\\n" +
          "Component: " +
          component +
          "\\n" +
          "Class Number: " +
          classNumber +
          "\\n" +
          "Days/Times: " +
          daysTimes +
          "\\n" +
          "Start/End Date: " +
          startEndDate +
          "\\n" +
          "Location: " +
          room +
          "\r\n" +
          "LAST-MODIFIED:20180101T000000Z\r\n" +
          "LOCATION:" +
          room +
          "\r\n" +
          "SEQUENCE:0\r\n" +
          "STATUS:CONFIRMED\r\n" +
          "SUMMARY:" +
          courseCode +
          " (" +
          component +
          ") in " +
          room +
          "\r\n" +
          "TRANSP:OPAQUE\r\n" +
          //'EXDATE;TZID=' + timezone + ':' + getDateTimeString(startDate, startTime) + '\r\n' +
          "END:VEVENT\r\n";

        //alert(iCalContent); // Debugging

        // Remove double spaces from content.
        //iCalContent = iCalContent.replace(/\s{2,}/g, ' ');

        if (component === "LAB") {
          iCalContentLab.push(iCalContent);
        } else if (component === "TUT") {
          iCalContentTut.push(iCalContent);
        } else if (component === "LEC") {
          iCalContentLec.push(iCalContent);
        } else if (component === "TST") {
          iCalContentTst.push(iCalContent);
        }
        numberOfEvents++;
        //alert(numberOfEvents);
      }
    });
  });

  // If no events were found, notify the user. Otherwise, proceed to download the ICS file.
  if ($(".PATRANSACTIONTITLE").text().indexOf("Download") < 0) {
    if (numberOfEvents === 0) {
      $(".PATRANSACTIONTITLE")
        .append(' (<a href="#">Download Schedule</a>)')
        .click(function () {
          alert(
            "Unable to create a schedule. No days or times were found on this page. Please make sure to be in List View after clicking Calendar View."
          );
          return false;
        });
    } else {
      let studentName = $("#DERIVED_SSTSNAV_PERSON_NAME").text().toLowerCase();
      studentName = studentName.replace(/\ /g, "-"); // Replace spaces with dashes.

      let fileNameLab = studentName + "-lab-schedule.ics";
      let fileNameTut = studentName + "-tut-schedule.ics";
      let fileNameLec = studentName + "-lec-schedule.ics";
      let fileNameTst = studentName + "-tst-schedule.ics";

      let downloadLinks = [
        {
          name: fileNameLab,
          content: wrapICalContent(iCalContentLab.join("")),
          type: "Lab",
        },
        {
          name: fileNameTut,
          content: wrapICalContent(iCalContentTut.join("")),
          type: "Tut",
        },
        {
          name: fileNameLec,
          content: wrapICalContent(iCalContentLec.join("")),
          type: "Lec",
        },
        {
          name: fileNameTst,
          content: wrapICalContent(iCalContentTst.join("")),
          type: "Tst",
        },
      ];

      downloadLinks.forEach((link) => {
        if (link.content.includes("BEGIN:VEVENT")) {
          $(".PATRANSACTIONTITLE").append(
            ' (<a href="data:text/calendar;charset=UTF-8,' +
              encodeURIComponent(link.content) +
              '" download="' +
              link.name +
              '">Download ' +
              link.type +
              " Schedule</a>)"
          );
        }
      });
    }
  }
};

let debug = false;
/**
 * Debug logging
 * @param {String} string ('4:30PM')
 */
function logger(string) {
  if (debug) {
    console.log("uwaterloo-schedule-exporter: " + string);
  }
}

$(document).ready(function () {
  // Debugging
  //debug = true;
  logger("Document ready");
  // Execute main function only when user is in the Enroll/my_class_schedule tab.
  //logger(document.getElementById("DERIVED_REGFRM1_SS_TRANSACT_TITLE").textContent);
  if (
    document.getElementById("DERIVED_REGFRM1_SS_TRANSACT_TITLE") &&
    document.getElementById("DERIVED_REGFRM1_SS_TRANSACT_TITLE").textContent ===
      "My Class Schedule"
  ) {
    // Only display the download button when the user is in List View.
    logger(
      document.getElementById("DERIVED_REGFRM1_SSR_SCHED_FORMAT$258$").checked
    );
    if (
      document.getElementById("DERIVED_REGFRM1_SSR_SCHED_FORMAT$258$").checked
    ) {
      main();
    }
  }
});
