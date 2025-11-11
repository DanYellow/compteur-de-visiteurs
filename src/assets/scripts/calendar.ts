const daysContainer = document.querySelector("[data-list-days]") as HTMLOListElement;
const navigationMonthsBtns = document.querySelectorAll("[data-navigation-month]");
const selectYearAndMonth = document.querySelectorAll("[data-calendar-select]") as unknown as HTMLSelectElement[];
const calendarDayTplRaw = document.querySelector("[data-template-id='calendar-day']") as HTMLTemplateElement;

let date = new Date();

const queryString = new URLSearchParams(window.location.search)
if (queryString.has("current_date")) {
    date = new Date(queryString.get("current_date") as string)
}

let currentYear = date.getFullYear();
let currentMonth = date.getMonth();

const renderCalendar = () => {
    let firstDayofMonth = new Date(currentYear, currentMonth, 0).getDay(); // getting first day of month
    let lastDateofMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // getting last date of month
    let lastDayofMonth = new Date(currentYear, currentMonth, lastDateofMonth).getDay(); // getting last day of month
    let lastDateofLastMonth = new Date(currentYear, currentMonth, 0).getDate(); // getting last date of previous month

    daysContainer.innerHTML = "";
    console.log(currentMonth)
    for (let i = firstDayofMonth; i > 0; i--) { // creating li of previous month last days
        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.add("inactive");

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        calendarDayTplLink.href = `?current_date=${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDateofLastMonth - i + 1).padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(lastDateofLastMonth - i + 1);

        daysContainer?.append(calendarDayTpl);
    }

    for (let i = 1; i <= lastDateofMonth; i++) { // creating li of all days of current month
        // adding active class to li if the current day, month, and year matched
        const isToday = i === date.getDate() && currentMonth === date.getMonth() && currentYear === date.getFullYear()

        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.toggle("active", isToday);

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        calendarDayTplLink.href = `?current_date=${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(i);

        daysContainer?.append(calendarDayTpl);
    }

    for (let i = lastDayofMonth; i < 7; i++) { // creating li of next month first days
        const calendarDayTpl = calendarDayTplRaw.content.cloneNode(true) as HTMLElement;
        const calendarDayTplLi = calendarDayTpl.querySelector("li");
        calendarDayTplLi?.classList.add("inactive");

        const calendarDayTplLink = calendarDayTpl.querySelector("a")!;
        calendarDayTplLink.href = `?current_date=${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-${String(i - lastDayofMonth + 1).padStart(2, "0")}`;
        calendarDayTplLink.textContent = String(i - lastDayofMonth + 1);

        daysContainer?.append(calendarDayTpl);
    }
}

renderCalendar();

const updateDropdowns = () => {
    selectYearAndMonth.forEach((item) => {
        const selectType = item.dataset.calendarSelect;
        if (selectType === "month") {
            item.value = String(currentMonth);
        } else {
            item.value = String(currentYear);
        }
    })
}
updateDropdowns();

selectYearAndMonth.forEach((item) => {
    item.addEventListener("change", (e) => {
        const select = e.currentTarget! as HTMLSelectElement;
        const selectType = select.dataset.calendarSelect;
        if (selectType === "month") {
            const monthSelected = select.value;
            date = new Date(currentYear, Number(monthSelected), 0);
        } else {
            const yearSelected = select.value;
            date = new Date(Number(yearSelected), currentMonth, 0);
        }
        currentYear = date.getFullYear(); // updating current year with new date year
        currentMonth = date.getMonth(); // updating current month with new date month

        renderCalendar();
    })
})

navigationMonthsBtns.forEach(icon => { // getting prev and next icons
    icon.addEventListener("click", (e) => { // adding click event on both icons
        const btn = e.currentTarget! as HTMLButtonElement;
        // if clicked icon is previous icon then decrement current month by 1 else increment it by 1

        currentMonth = btn.dataset.navigationMonth === "prev"
            ? currentMonth - 1
            : currentMonth + 1;

            if (currentMonth < 0 || currentMonth > 11) { // if current month is less than 0 or greater than 11
            // creating a new date of current year & month and pass it as date value
            date = new Date(currentYear, currentMonth, new Date().getDate());
            currentYear = date.getFullYear(); // updating current year with new date year
            currentMonth = date.getMonth(); // updating current month with new date month
        } else {
            // date = new Date(); // pass the current date as date value
        }
        updateDropdowns();
        renderCalendar();
    });
});
