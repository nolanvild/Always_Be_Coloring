import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { DOWNLOAD_FORMATS } from "@/lib/formats";

type PageInput = {
  id: string;
  coloringImageUrl: string;
  label?: string;
};

type DownloadOptions = {
  includeTitlePage?: boolean;
  addPageNumbers?: boolean;
  cropMarks?: boolean;
};

// A4 fallback in PDF points (1 point = 1/72 inch)
const A4_WIDTH_PT = 595;
const A4_HEIGHT_PT = 842;

function pxToPt(px: number, ppi: number): number {
  return (px / ppi) * 72;
}

/**
 * Resolve an image URL (HTTP/HTTPS or data: URI) to raw bytes + MIME type.
 */
async function resolveImage(url: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (url.startsWith("data:")) {
    // data:[<mediatype>][;base64],<data>
    const commaIdx = url.indexOf(",");
    const meta = url.slice(5, commaIdx); // strip "data:"
    const isBase64 = meta.endsWith(";base64");
    const mimeType = isBase64 ? meta.slice(0, -7) : meta || "image/png";
    const dataStr = url.slice(commaIdx + 1);
    const bytes = isBase64
      ? Uint8Array.from(atob(dataStr), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(dataStr));
    return { bytes, mimeType };
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, mimeType };
}

async function embedImage(pdfDoc: PDFDocument, url: string) {
  const { bytes, mimeType } = await resolveImage(url);

  // SVG must be rasterised to PNG before embedding
  if (mimeType.includes("svg")) {
    const pngBytes = await sharp(Buffer.from(bytes)).png().toBuffer();
    return pdfDoc.embedPng(new Uint8Array(pngBytes));
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return pdfDoc.embedJpg(bytes);
  }

  // Default: try PNG, fallback to JPEG
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const pages: PageInput[] = body.pages ?? [];
  const formatId: string = body.format ?? "a4";
  const options: DownloadOptions = body.options ?? {};

  const format = DOWNLOAD_FORMATS.find((f) => f.id === formatId);

  let pageWidthPt: number;
  let pageHeightPt: number;

  if (!format || format.widthPx === 0) {
    pageWidthPt = A4_WIDTH_PT;
    pageHeightPt = A4_HEIGHT_PT;
  } else {
    pageWidthPt = pxToPt(format.widthPx, format.ppi);
    pageHeightPt = pxToPt(format.heightPx, format.ppi);
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Title page
  if (options.includeTitlePage) {
    const titlePage = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    const title = "Always Be Coloring";
    const titleFontSize = Math.min(pageWidthPt * 0.06, 48);
    const titleWidth = font.widthOfTextAtSize(title, titleFontSize);
    titlePage.drawText(title, {
      x: (pageWidthPt - titleWidth) / 2,
      y: pageHeightPt / 2,
      size: titleFontSize,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });
  }

  // Coloring pages
  for (let i = 0; i < pages.length; i++) {
    const { coloringImageUrl, label } = pages[i];

    let embeddedImage;
    try {
      embeddedImage = await embedImage(pdfDoc, coloringImageUrl);
    } catch (err) {
      const blankPage = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
      const msg = label ? `Could not load: ${label}` : "Image unavailable";
      console.error(`[download] Failed to embed page ${i + 1}:`, err);
      blankPage.drawText(msg, { x: 50, y: pageHeightPt / 2, size: 14, font, color: rgb(0.5, 0.5, 0.5) });
      continue;
    }

    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // Scale image to fill page while preserving aspect ratio
    const imgAspect = embeddedImage.width / embeddedImage.height;
    const pageAspect = pageWidthPt / pageHeightPt;

    let drawW: number;
    let drawH: number;
    if (imgAspect > pageAspect) {
      drawW = pageWidthPt;
      drawH = pageWidthPt / imgAspect;
    } else {
      drawH = pageHeightPt;
      drawW = pageHeightPt * imgAspect;
    }

    const drawX = (pageWidthPt - drawW) / 2;
    const drawY = (pageHeightPt - drawH) / 2;

    page.drawImage(embeddedImage, { x: drawX, y: drawY, width: drawW, height: drawH });

    // Page numbers
    if (options.addPageNumbers) {
      const pageNum = String(i + 1);
      const numFontSize = 10;
      const numWidth = font.widthOfTextAtSize(pageNum, numFontSize);
      page.drawText(pageNum, {
        x: (pageWidthPt - numWidth) / 2,
        y: 20,
        size: numFontSize,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }
  }

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="abc-always-be-coloring.pdf"'
    }
  });
}
