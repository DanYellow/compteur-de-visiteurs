const buttonTemplate = document.querySelector('[data-template-id="button-toggle"]')! as HTMLTemplateElement;
const visibleIconTemplate = document.querySelector('[data-template-id="visible-svg"]')! as HTMLTemplateElement;
const hiddenIconTemplate = document.querySelector('[data-template-id="hidden-svg"]')! as HTMLTemplateElement;

const toggleVisibility = (e: Event) => {
    const element = e.currentTarget! as HTMLDivElement;

    const input = element.parentNode!.querySelector("input") as HTMLInputElement;
    const icon = element.querySelector("svg")!;
    const inputParent = input.parentNode! as HTMLDivElement;

    if (input.type === "password") {
        input.type = "text"
        inputParent.querySelector("button")!.title = "Cacher mot de passe"
        icon.replaceWith(document.importNode(hiddenIconTemplate.content, true).querySelector("svg")!)
    } else {
        input.type = "password"
        inputParent.querySelector("button")!.title = "Afficher mot de passe"
        icon.replaceWith(document.importNode(visibleIconTemplate.content, true).querySelector("svg")!)
    }
}

document
    .querySelectorAll("input[type='password'][data-input-toggle-visibility]")
    .forEach((item) => {
        const clone = document.importNode(buttonTemplate.content, true);

        clone.querySelector("button")!.addEventListener("click", toggleVisibility);

        const wrappingElement = document.createElement("div");
        wrappingElement.classList.add(...["relative"]);
        item.replaceWith(wrappingElement);
        wrappingElement.appendChild(item);
        wrappingElement.appendChild(clone);
    });
