import { DateTime } from "luxon";

const daysContainer = document.querySelector("[data-list-days]") as HTMLOListElement;
const navigationMonthsBtns = document.querySelectorAll("[data-navigation-month]");
const selectYearAndMonth = document.querySelectorAll("[data-calendar-select]") as unknown as HTMLSelectElement[];
const calendarDayTplRaw = document.querySelector("[data-template-id='calendar-day']") as HTMLTemplateElement;

let currentDay = DateTime.now();
let staticCurrentDay = DateTime.now().toFormat("yyyy-LL-dd");

const queryString = new URLSearchParams(window.location.search);
if (queryString.has("current_date")) {
    const tmpDate = DateTime.fromISO(queryString.get("current_date") as string);
    if (tmpDate.isValid) {
        currentDay = tmpDate;
    }
    staticCurrentDay = currentDay.toFormat("yyyy-LL-dd");
}

let currentYear = currentDay.get('year');
let currentMonth = currentDay.get('month');

const renderCalendar = () => {
    daysContainer.innerHTML = "";

    const firstDayOfMonth = currentDay.startOf("month");
    const lastDayOfMonth = currentDay.endOf("month");

    const lastDayLastMonth = currentDay.startOf("month").minus({ months: 1 }).endOf("month")
    const firstDayNextMonth = currentDay.startOf("month").plus({ months: 1 }).startOf("month")

    for (let i = firstDayOfMonth.weekday - 1; i > 0; i--) {
        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.add("inactive");

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        const dayNumber = String(lastDayLastMonth.get("day") - i + 1);
        const yearAndMonth = `${lastDayLastMonth.get("year")}-${String(lastDayLastMonth.get("month")).padStart(2, "0")}`;

        calendarDayTplLink.href = `?current_date=${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(dayNumber);

        daysContainer?.append(calendarDayTpl);
    }

    for (let i = 1; i <= lastDayOfMonth.get("day"); i++) { // creating li of all days of current month
        // adding active class to li if the current day, month, and year matched
        const dayNumber = String(i);
        const yearAndMonth = `${currentDay.get("year")}-${String(currentDay.get("month")).padStart(2, "0")}`;

        const isToday = `${yearAndMonth}-${dayNumber.padStart(2, "0")}` === staticCurrentDay;

        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.toggle("active", isToday);

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;

        calendarDayTplLink.href = `?current_date=${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(i);

        daysContainer?.append(calendarDayTpl);
    }

    for (let i = lastDayOfMonth.weekday; i < 7; i++) { // creating li of next month first days
        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.add("inactive");

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        const dayNumber = String(i - lastDayOfMonth.weekday + 1);
        const yearAndMonth = `${firstDayNextMonth.get("year")}-${String(firstDayNextMonth.get("month")).padStart(2, "0")}`;
        calendarDayTplLink.href = `?current_date=${yearAndMonth}-${dayNumber.padStart(2, "0")}`;
        // calendarDayTplLink.href = `?current_date=${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-${String(i - lastDayofMonth + 1).padStart(2, "0")}`;
        calendarDayTplLink.textContent = dayNumber;

        daysContainer?.append(calendarDayTpl);
    }
}


renderCalendar();

// const updateDropdowns = () => {
//     selectYearAndMonth.forEach((item) => {
//         const selectType = item.dataset.calendarSelect;
//         if (selectType === "month") {
//             item.value = String(currentMonth);
//         } else {
//             item.value = String(currentYear);
//         }
//     })
// }
// updateDropdowns();

// selectYearAndMonth.forEach((item) => {
//     item.addEventListener("change", (e) => {
//         const select = e.currentTarget! as HTMLSelectElement;
//         const selectType = select.dataset.calendarSelect;
//         if (selectType === "month") {
//             const monthSelected = select.value;
//             date = new Date(currentYear, Number(monthSelected), 0);
//         } else {
//             const yearSelected = select.value;
//             date = new Date(Number(yearSelected), currentMonth, 0);
//         }
//         currentYear = date.getFullYear(); // updating current year with new date year
//         currentMonth = date.getMonth(); // updating current month with new date month

//         renderCalendar();
//     })
// })

// navigationMonthsBtns.forEach(icon => { // getting prev and next icons
//     icon.addEventListener("click", (e) => { // adding click event on both icons
//         const btn = e.currentTarget! as HTMLButtonElement;
//         // if clicked icon is previous icon then decrement current month by 1 else increment it by 1

//         currentMonth = btn.dataset.navigationMonth === "prev"
//             ? currentMonth - 1
//             : currentMonth + 1;

//             if (currentMonth < 0 || currentMonth > 11) { // if current month is less than 0 or greater than 11
//             // creating a new date of current year & month and pass it as date value
//             date = new Date(currentYear, currentMonth, new Date().getDate());
//             currentYear = date.getFullYear(); // updating current year with new date year
//             currentMonth = date.getMonth(); // updating current month with new date month
//         } else {
//             // date = new Date(); // pass the current date as date value
//         }
//         updateDropdowns();
//         renderCalendar();
//     });
// });
