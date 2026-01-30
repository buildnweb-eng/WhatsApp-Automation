/**
 * PDF Service
 * Generates order receipts using pdf-lib
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { logger } from '../utils/logger';
import type { ReceiptData, GeneratedPdf } from '../domain/types/pdf.types';

export class PdfService {
  private readonly tempDir = '/tmp/receipts';

  /**
   * Generate order receipt PDF
   */
  async generateOrderReceipt(data: ReceiptData): Promise<GeneratedPdf> {
    // Ensure temp directory exists
    await mkdir(this.tempDir, { recursive: true });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size in points

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Colors
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.9, 0.9, 0.9);

    // ============ HEADER ============
    // Business Name
    page.drawText(data.businessName.toUpperCase(), {
      x: margin,
      y,
      size: 22,
      font: boldFont,
      color: black,
    });
    y -= 28;

    // ORDER RECEIPT title
    page.drawText('ORDER RECEIPT', {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: gray,
    });
    y -= 35;

    // Horizontal line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 25;

    // ============ ORDER INFO ============
    const orderDate = this.formatDate(data.orderDate);
    const paidDate = this.formatDate(data.paidAt);

    // Left column - Order details
    page.drawText('Order ID:', { x: margin, y, size: 10, font: boldFont, color: gray });
    page.drawText(data.orderId, { x: margin + 70, y, size: 10, font: font, color: black });
    y -= 18;

    page.drawText('Order Date:', { x: margin, y, size: 10, font: boldFont, color: gray });
    page.drawText(orderDate, { x: margin + 70, y, size: 10, font: font, color: black });
    y -= 18;

    page.drawText('Customer:', { x: margin, y, size: 10, font: boldFont, color: gray });
    page.drawText(data.customerName, { x: margin + 70, y, size: 10, font: font, color: black });
    y -= 18;

    page.drawText('Phone:', { x: margin, y, size: 10, font: boldFont, color: gray });
    page.drawText(data.customerPhone, { x: margin + 70, y, size: 10, font: font, color: black });
    y -= 30;

    // Horizontal line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 20;

    // ============ ITEMS TABLE ============
    page.drawText('ITEMS', { x: margin, y, size: 12, font: boldFont, color: black });
    y -= 25;

    // Table headers
    const colProduct = margin;
    const colQty = 320;
    const colPrice = 390;
    const colTotal = 480;

    page.drawText('Product', { x: colProduct, y, size: 9, font: boldFont, color: gray });
    page.drawText('Qty', { x: colQty, y, size: 9, font: boldFont, color: gray });
    page.drawText('Price', { x: colPrice, y, size: 9, font: boldFont, color: gray });
    page.drawText('Total', { x: colTotal, y, size: 9, font: boldFont, color: gray });
    y -= 15;

    // Header line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: lightGray,
    });
    y -= 15;

    // Items
    for (const item of data.items) {
      const productName = this.truncateText(item.productName, 40);

      page.drawText(productName, { x: colProduct, y, size: 10, font: font, color: black });
      page.drawText(item.quantity.toString(), { x: colQty, y, size: 10, font: font, color: black });
      page.drawText(`${data.currency} ${item.priceInRupees.toFixed(2)}`, { x: colPrice, y, size: 10, font: font, color: black });
      page.drawText(`${data.currency} ${item.totalInRupees.toFixed(2)}`, { x: colTotal, y, size: 10, font: font, color: black });
      y -= 20;
    }

    y -= 10;

    // Total line
    page.drawLine({
      start: { x: colPrice - 10, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 20;

    // Total amount
    page.drawText('TOTAL:', { x: colPrice, y, size: 12, font: boldFont, color: black });
    page.drawText(`${data.currency} ${data.totalAmount.toFixed(2)}`, { x: colTotal, y, size: 12, font: boldFont, color: black });
    y -= 35;

    // Horizontal line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 20;

    // ============ PAYMENT DETAILS ============
    page.drawText('PAYMENT DETAILS', { x: margin, y, size: 12, font: boldFont, color: black });
    y -= 22;

    page.drawText('Method:', { x: margin, y, size: 10, font: boldFont, color: gray });
    page.drawText(data.paymentMethod, { x: margin + 70, y, size: 10, font: font, color: black });
    y -= 18;

    if (data.paymentId) {
      page.drawText('Payment ID:', { x: margin, y, size: 10, font: boldFont, color: gray });
      page.drawText(data.paymentId, { x: margin + 70, y, size: 10, font: font, color: black });
      y -= 18;
    }

    page.drawText('Paid At:', { x: margin, y, size: 10, font: boldFont, color: gray });
    page.drawText(paidDate, { x: margin + 70, y, size: 10, font: font, color: black });
    y -= 30;

    // Horizontal line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 20;

    // ============ SHIPPING ADDRESS ============
    page.drawText('SHIPPING ADDRESS', { x: margin, y, size: 12, font: boldFont, color: black });
    y -= 22;

    // Split address into lines if too long
    const addressLines = this.wrapText(data.shippingAddress.fullAddress, 70);
    for (const line of addressLines) {
      page.drawText(line, { x: margin, y, size: 10, font: font, color: black });
      y -= 16;
    }

    if (data.shippingAddress.city || data.shippingAddress.state || data.shippingAddress.pincode) {
      const cityStatePin = [
        data.shippingAddress.city,
        data.shippingAddress.state,
        data.shippingAddress.pincode,
      ].filter(Boolean).join(', ');

      page.drawText(cityStatePin, { x: margin, y, size: 10, font: font, color: black });
      y -= 16;
    }

    y -= 30;

    // ============ FOOTER ============
    // Horizontal line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 25;

    // Thank you message
    page.drawText('Thank you for your order!', {
      x: margin,
      y,
      size: 12,
      font: boldFont,
      color: black,
    });
    y -= 18;

    page.drawText(`Contact: ${data.businessPhone}`, {
      x: margin,
      y,
      size: 10,
      font: font,
      color: gray,
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const filename = `receipt-${data.orderId}.pdf`;
    const filePath = join(this.tempDir, filename);

    await writeFile(filePath, pdfBytes);

    logger.info({ orderId: data.orderId, filePath }, 'PDF receipt generated');

    return {
      buffer: pdfBytes,
      filename,
      filePath,
    };
  }

  /**
   * Cleanup temp file
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      logger.debug({ filePath }, 'Cleaned up temp PDF file');
    } catch (error) {
      // Log but don't throw - cleanup is best-effort
      logger.warn({ error, filePath }, 'Failed to cleanup temp PDF file');
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Truncate text if too long
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Wrap text into multiple lines
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}

// Singleton instance
export const pdfService = new PdfService();
