import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface ExportPdfOptions {
  element: HTMLElement;
  filename: string;
}

export async function exportReportCardToPdf({ element, filename }: ExportPdfOptions): Promise<void> {
  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  // Standard minimal print margin: 4mm on left and right for edge-to-edge full width appearance
  const marginX = 4; // 4mm side margin
  const marginY = 4; // 4mm top/bottom margin
  const printWidth = pageWidth - marginX * 2; // 202mm wide (fills 96.2% of A4 width)
  const maxHeight = pageHeight - marginY * 2; // 289mm max printable height

  // Standard A4 pixel width at 96 DPI is 794px
  const targetA4PxWidth = 794;

  // Render high-res canvas using html2canvas-pro with oklch support
  const canvas = await html2canvas(element, {
    scale: 2, // 2x for ultra-sharp print quality
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: targetA4PxWidth,
    onclone: (clonedDoc) => {
      // Ensure the cloned card is rendered at standard A4 width without viewport distortions
      const clonedElement = clonedDoc.getElementById(element.id);
      if (clonedElement) {
        // Unhide all ancestor containers in the clone so canvas can measure and render
        let ancestor = clonedElement.parentElement;
        while (ancestor && ancestor !== clonedDoc.body) {
          ancestor.style.display = 'block';
          ancestor = ancestor.parentElement;
        }
        clonedElement.style.display = 'block';
        clonedElement.style.boxShadow = 'none';
        clonedElement.style.margin = '0';
        clonedElement.style.width = `${targetA4PxWidth}px`;
        clonedElement.style.minWidth = `${targetA4PxWidth}px`;
        clonedElement.style.maxWidth = `${targetA4PxWidth}px`;
        clonedElement.style.boxSizing = 'border-box';
      }
    }
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const printHeight = (canvas.height * printWidth) / canvas.width;

  if (printHeight <= maxHeight) {
    // Fits comfortably on 1 single page across the full width
    pdf.addImage(imgData, 'JPEG', marginX, marginY, printWidth, printHeight);
  } else {
    // If slightly exceeding, scale to fit strictly within 1 single A4 page
    const scale = maxHeight / printHeight;
    const fittedWidth = printWidth * scale;
    const xOffset = marginX + (printWidth - fittedWidth) / 2;
    pdf.addImage(imgData, 'JPEG', xOffset, marginY, fittedWidth, maxHeight);
  }

  pdf.save(filename);
}

export interface ExportBatchPdfOptions {
  elements: HTMLElement[];
  filename: string;
  onProgress?: (current: number, total: number) => void;
}

export async function exportBatchReportCardsToPdf({ 
  elements, 
  filename, 
  onProgress 
}: ExportBatchPdfOptions): Promise<void> {
  if (!elements || elements.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const marginX = 4;
  const marginY = 4;
  const printWidth = pageWidth - marginX * 2;
  const maxHeight = pageHeight - marginY * 2;
  const targetA4PxWidth = 794;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (i > 0) {
      pdf.addPage();
    }
    if (onProgress) {
      onProgress(i + 1, elements.length);
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetA4PxWidth,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(el.id);
        if (clonedElement) {
          let ancestor = clonedElement.parentElement;
          while (ancestor && ancestor !== clonedDoc.body) {
            ancestor.style.display = 'block';
            ancestor = ancestor.parentElement;
          }
          clonedElement.style.display = 'block';
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.margin = '0';
          clonedElement.style.width = `${targetA4PxWidth}px`;
          clonedElement.style.minWidth = `${targetA4PxWidth}px`;
          clonedElement.style.maxWidth = `${targetA4PxWidth}px`;
          clonedElement.style.boxSizing = 'border-box';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const printHeight = (canvas.height * printWidth) / canvas.width;

    if (printHeight <= maxHeight) {
      pdf.addImage(imgData, 'JPEG', marginX, marginY, printWidth, printHeight);
    } else {
      const scale = maxHeight / printHeight;
      const fittedWidth = printWidth * scale;
      const xOffset = marginX + (printWidth - fittedWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, marginY, fittedWidth, maxHeight);
    }
  }

  pdf.save(filename);
}

export async function exportAdmitCardToPdf({ element, filename }: ExportPdfOptions): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 6;
  const marginY = 6;
  const printWidth = pageWidth - marginX * 2;
  const maxHeight = pageHeight - marginY * 2;
  const targetA4PxWidth = 794;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: targetA4PxWidth,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(element.id);
      if (clonedElement) {
        clonedElement.style.boxShadow = 'none';
        clonedElement.style.margin = '0';
        clonedElement.style.width = `${targetA4PxWidth}px`;
        clonedElement.style.minWidth = `${targetA4PxWidth}px`;
        clonedElement.style.maxWidth = `${targetA4PxWidth}px`;
        clonedElement.style.boxSizing = 'border-box';
      }
    }
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const printHeight = (canvas.height * printWidth) / canvas.width;

  if (printHeight <= maxHeight) {
    pdf.addImage(imgData, 'JPEG', marginX, marginY, printWidth, printHeight);
  } else {
    const scale = maxHeight / printHeight;
    const fittedWidth = printWidth * scale;
    const xOffset = marginX + (printWidth - fittedWidth) / 2;
    pdf.addImage(imgData, 'JPEG', xOffset, marginY, fittedWidth, maxHeight);
  }

  pdf.save(filename);
}

export async function exportBatchAdmitCardsToPdf({ 
  elements, 
  filename, 
  onProgress 
}: ExportBatchPdfOptions): Promise<void> {
  if (!elements || elements.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 6;
  const marginY = 6;
  const printWidth = pageWidth - marginX * 2;
  const maxHeight = pageHeight - marginY * 2;
  const targetA4PxWidth = 794;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (i > 0) {
      pdf.addPage();
    }
    if (onProgress) {
      onProgress(i + 1, elements.length);
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetA4PxWidth,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(el.id);
        if (clonedElement) {
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.margin = '0';
          clonedElement.style.width = `${targetA4PxWidth}px`;
          clonedElement.style.minWidth = `${targetA4PxWidth}px`;
          clonedElement.style.maxWidth = `${targetA4PxWidth}px`;
          clonedElement.style.boxSizing = 'border-box';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const printHeight = (canvas.height * printWidth) / canvas.width;

    if (printHeight <= maxHeight) {
      pdf.addImage(imgData, 'JPEG', marginX, marginY, printWidth, printHeight);
    } else {
      const scale = maxHeight / printHeight;
      const fittedWidth = printWidth * scale;
      const xOffset = marginX + (printWidth - fittedWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, marginY, fittedWidth, maxHeight);
    }
  }

  pdf.save(filename);
}
