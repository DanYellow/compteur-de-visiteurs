import SignaturePad from "signature_pad";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
const container = canvas.parentElement;
const input = container?.querySelector("input") as HTMLInputElement;

const signaturePad = new SignaturePad(canvas);

const resizeCanvas = () => {
    canvas.width = canvas.parentElement!.offsetWidth;
    canvas.height = canvas.parentElement!.offsetHeight;

    signaturePad.redraw();
}

resizeCanvas();

window.addEventListener('resize', resizeCanvas, false);

signaturePad.addEventListener("endStroke", () => {
    if (!input.checked) {
        input.click();
    }
});

const clearButton = document.querySelector('[data-clear-signature-button]')
clearButton?.addEventListener("click", () => {
    if (input.checked) {
        input.click();
    }
    signaturePad.clear();
});
