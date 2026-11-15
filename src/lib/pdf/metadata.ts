import { PDFDocument, PDFName } from 'pdf-lib';

/**
 * Clears document metadata that can leak names, software and timestamps
 * (NFR-2). Called on every PDF the app writes.
 */
export function scrubMetadata(doc: PDFDocument): void {
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('FormReady');
  doc.setCreator('FormReady');
  const epoch = new Date(0);
  doc.setCreationDate(epoch);
  doc.setModificationDate(epoch);
  // Drop any XMP packet so the Info dictionary is the only metadata left.
  doc.catalog.delete(PDFName.of('Metadata'));
}

/** Saves with object streams for a smaller file and metadata scrubbed. */
export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  scrubMetadata(doc);
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}
