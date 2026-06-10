import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

export const parsePdf = async (input) => {
  let dataBuffer;
  if (Buffer.isBuffer(input)) {
    dataBuffer = input;
  } else {
    dataBuffer = await readFile(input);
  }
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return result.text || '';
};
