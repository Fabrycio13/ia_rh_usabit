import * as pdfjs from 'pdfjs-dist';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Converte páginas de um PDF em imagens (base64)
 */
export async function pdfToImages(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    const pagesToProcess = Math.min(pdf.numPages, 10);

    for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvas: canvas,
            canvasContext: context,
            viewport: viewport,
        }).promise;

        images.push(canvas.toDataURL('image/jpeg', 0.8));
    }

    return images;
}

/**
 * Extrai texto de um arquivo PDF
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        const pagesToProcess = Math.min(pdf.numPages, 10);
        for (let i = 1; i <= pagesToProcess; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => (item as { str: string }).str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim().slice(0, 30000);
    } catch (err: unknown) {
        console.error('Erro na extração de PDF:', err);
        throw new Error(`Falha ao ler PDF "${file.name}": ${(err as Error).message}`);
    }
}