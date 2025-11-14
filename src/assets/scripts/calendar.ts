import { DateTime } from "luxon";
import config from "#config" with { type: "json" };
import { capitalizeFirstLetter } from "./utils.shared";

const calendarWrapper = document.getElementById("calendar");
const daysContainer = document.querySelector("[data-list-days]") as HTMLOListElement;
const navigationMonthsBtns = document.querySelectorAll("[data-navigation-month]");
const listSiblingsMonthLabel = document.querySelectorAll("[data-month]") as unknown as HTMLSpanElement[];
const selectYearAndMonth = document.querySelectorAll("[data-calendar-select]") as unknown as HTMLSelectElement[];
const calendarDayTplRaw = document.querySelector("[data-template-id='calendar-day']") as HTMLTemplateElement;

let currentDay = DateTime.now();
const today = DateTime.now().toFormat("yyyy-LL-dd");
let staticCurrentDay = DateTime.now().toFormat("yyyy-LL-dd");
const listClosedDaysIndex = config.CLOSED_DAYS_INDEX.split(",").filter(Boolean).map(String);

const queryString = new URLSearchParams(window.location.search);
if (queryString.has("current_date")) {
    const tmpDate = DateTime.fromISO(queryString.get("current_date") as string);
    if (tmpDate.isValid) {
        currentDay = tmpDate;
    }
    staticCurrentDay = currentDay.toFormat("yyyy-LL-dd");
}

const loadMonth = (e: FocusEvent) => {
    const date = e.currentTarget as HTMLLinkElement;
    const dateSelected = date.dataset.date;
    const monthType = date.dataset.month;

    if (monthType === "prev") {
        currentDay = currentDay.minus({ months: 1 })
    } else {
        currentDay = currentDay.plus({ months: 1 })
    }

    updateDropdowns();
    renderCalendar();

    (document.querySelector(`[data-date="${dateSelected}"]`) as HTMLLinkElement).focus();
}

const renderCalendar = () => {
    if (!daysContainer) {
        return;
    }
    daysContainer.innerHTML = "";

    const firstDayOfMonth = currentDay.startOf("month");
    const lastDayOfMonth = currentDay.endOf("month");

    const lastDayLastMonth = currentDay.startOf("month").minus({ months: 1 }).endOf("month")
    const firstDayNextMonth = currentDay.startOf("month").plus({ months: 1 }).startOf("month")

    listSiblingsMonthLabel[0].textContent = capitalizeFirstLetter(lastDayLastMonth.toFormat("LLLL", { locale: "fr" }))
    listSiblingsMonthLabel[1].textContent = capitalizeFirstLetter(firstDayNextMonth.toFormat("LLLL", { locale: "fr" }))

    const countdownPrevMonth = firstDayOfMonth.weekday === 1 ? 8 : firstDayOfMonth.weekday;

    for (let i = countdownPrevMonth - 1; i > 0; i--) {
        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.add("inactive");

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        const dayNumber = String(lastDayLastMonth.get("day") - i + 1);
        const yearAndMonth = `${lastDayLastMonth.get("year")}-${String(lastDayLastMonth.get("month")).padStart(2, "0")}`;

        const weekday = DateTime.fromISO(`${yearAndMonth}-${dayNumber.padStart(2, "0")}`).weekday;

        calendarDayTplLink.classList.toggle("open", !listClosedDaysIndex.includes(String(weekday)));
        calendarDayTplLink.href = `?current_date=${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(dayNumber);
        calendarDayTplLink.dataset.month = "prev";
        calendarDayTplLink.dataset.date = `${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.title = DateTime.fromISO(`${yearAndMonth}-${dayNumber.padStart(2, "0")}`).toFormat("EEEE dd LLLL yyyy", { locale: "fr" })
        calendarDayTplLink.addEventListener("focus", loadMonth);

        daysContainer?.append(calendarDayTpl);
    }

    // Current month
    for (let i = 1; i <= lastDayOfMonth.get("day"); i++) { // creating li of all days of current month
        // adding active class to li if the current day, month, and year matched
        const dayNumber = String(i);
        const yearAndMonth = `${currentDay.get("year")}-${String(currentDay.get("month")).padStart(2, "0")}`;

        const isDaySelected = `${yearAndMonth}-${dayNumber.padStart(2, "0")}` === staticCurrentDay;
        const isToday = `${yearAndMonth}-${dayNumber.padStart(2, "0")}` === today;

        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.toggle("active", isDaySelected);
        calendarDayTplLi?.classList.toggle("today", isToday);

        const weekday = DateTime.fromISO(`${yearAndMonth}-${dayNumber.padStart(2, "0")}`).weekday;
        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        calendarDayTplLink.classList.toggle("open", !listClosedDaysIndex.includes(String(weekday)));

        calendarDayTplLink.href = `?current_date=${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(i);
        calendarDayTplLink.dataset.date = `${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        // calendarDayTplLink.tabIndex = -1;
        calendarDayTplLink.title = DateTime.fromISO(`${yearAndMonth}-${dayNumber.padStart(2, "0")}`).toFormat("EEEE dd LLLL yyyy", { locale: "fr" })

        daysContainer?.append(calendarDayTpl);
    }

    const countdownNextMonth = lastDayOfMonth.weekday === 7 ? 0 : lastDayOfMonth.weekday;
    for (let i = countdownNextMonth; i < 7; i++) { // creating li of next month first days
        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.add("inactive");

        const yearAndMonth = `${firstDayNextMonth.get("year")}-${String(firstDayNextMonth.get("month")).padStart(2, "0")}`;
        const dayNumber = String(i - countdownNextMonth + 1);

        const weekday = DateTime.fromISO(`${yearAndMonth}-${dayNumber.padStart(2, "0")}`).weekday;

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        calendarDayTplLink.href = `?current_date=${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.textContent = dayNumber;
        calendarDayTplLink.classList.toggle("open", !listClosedDaysIndex.includes(String(weekday)));
        calendarDayTplLink.title = DateTime.fromISO(`${yearAndMonth}-${dayNumber.padStart(2, "0")}`).toFormat("EEEE dd LLLL yyyy", { locale: "fr" });
        calendarDayTplLink.dataset.month = "next";
        calendarDayTplLink.dataset.date = `${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.addEventListener("focus", loadMonth);

        daysContainer?.append(calendarDayTpl);
    }
}

const updateDropdowns = () => {
    selectYearAndMonth.forEach((item) => {
        const selectType = item.dataset.calendarSelect;
        if (selectType === "month") {
            item.value = String(currentDay.get("month"));
        } else {
            item.value = String(currentDay.get("year"));
        }
    })
}



selectYearAndMonth.forEach((item) => {
    item.addEventListener("change", (e) => {
        const select = e.currentTarget! as HTMLSelectElement;
        const selectType = select.dataset.calendarSelect;
        if (selectType === "month") {
            const monthSelected = select.value;
            currentDay = currentDay.set({ month: Number(monthSelected) });
        } else {
            const yearSelected = select.value;
            currentDay = currentDay.set({ year: Number(yearSelected) });
        }

        renderCalendar();
    })
})

navigationMonthsBtns.forEach(icon => {
    icon.addEventListener("click", (e) => {
        const btn = e.currentTarget! as HTMLButtonElement;
        if (btn.dataset.navigationMonth === "prev") {
            currentDay = currentDay.minus({ months: 1 })
        } else {
            currentDay = currentDay.plus({ months: 1 })
        }

        updateDropdowns();
        renderCalendar();
    });
});

renderCalendar();
updateDropdowns();

calendarWrapper?.addEventListener("toggle", (e: Event) => {
    const toggleEvent = e as ToggleEvent;
    const isOpened = toggleEvent.newState === "open";

    if (isOpened) {
        ;(calendarWrapper.querySelector(`[data-date="${currentDay.toFormat("yyyy-LL-dd")}"]`) as HTMLLinkElement).focus();
    }
})
