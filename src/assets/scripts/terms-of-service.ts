

// import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// const canvas = document.getElementById("pdf-canvas");
// const pdfUrl = "/file.tmp.pdf";

// GlobalWorkerOptions.workerSrc =
//     "../../../node_modules/pdfjs-dist/build/pdf.worker.mjs";

// getDocument(pdfUrl).promise.then((pdfDoc) => {
//     pdfDoc.getPage(1).then(function (page) {
//         const viewport = page.getViewport({ scale: 1 });
//         canvas.width = viewport.width;
//         canvas.height = viewport.height;

//         const ctx = canvas.getContext("2d");
//         const renderContext = {
//             canvasContext: ctx,
//             viewport: viewport,
//         };

//         page.render(renderContext);
//     });
// })

// console.log(pdfjsLib)

const terms = document.querySelector("[data-terms-of-service]") as HTMLIFrameElement;

// console.log(terms)
// function obCallback(payload) {
//     console.log(payload[0].intersectionRatio);
// }

// const ob = new IntersectionObserver(obCallback);
// ob.observe(terms);

// console.log("fefzzzz")
// terms.addEventListener('load', e => {
//     e.target.contentWindow.addEventListener('scroll', () => {
//         console.log('scrollin');
//     });
// });
