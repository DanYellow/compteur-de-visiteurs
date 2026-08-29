const listLabels = document.querySelectorAll("label") as NodeListOf<HTMLLabelElement>;

if ('paintWorklet' in CSS) {
    const ripple = await import('#scripts/worklets/ripple?url');
    (CSS as any).paintWorklet.addModule(ripple.default);
}

const rippleEffect = (e: MouseEvent, color = "#fff") => {
    return new Promise((resolve) => {
        if ("paintWorklet" in CSS === false) {
            resolve(null);
        }
        const $el = e.currentTarget as HTMLDivElement;
        $el.classList.add('animating');

        const rect = $el.getBoundingClientRect();

        const rippleEffectDuration = Number(window.getComputedStyle($el).getPropertyValue('--ripple-speed') || 350);

        const [x, y] = [Number(e.clientX - rect.left), Number(e.clientY - rect.top)];
        const start = performance.now();

        requestAnimationFrame(function raf(now) {
            const count = Math.floor(now - start);
            $el.style.cssText = `--ripple-x: ${x}; --ripple-y: ${y}; --animation-tick: ${count}; --ripple-color: ${color}`;

            if (count > rippleEffectDuration) {
                $el.classList.remove('animating');
                $el.style.cssText = `--animation-tick: 0`;

                resolve(null);

                return;
            }
            requestAnimationFrame(raf);
        });
    })
}


const rippleColor = window.getComputedStyle(document.body).getPropertyValue('--color-white-numixs');

listLabels.forEach((item) => {
    item.addEventListener("click", async (e) => {
        await rippleEffect(e, rippleColor);
    })
})
