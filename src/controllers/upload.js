import { readFileSync, readdirSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { basename, join, extname } from 'node:path';
import { PDFParse } from 'pdf-parse';

const parsePdf = async (dataBuffer) => {
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return { text: result.text };
};

export const buildUploadController = (ragService) => async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path, mimetype } = req.file;
    let textContent = '';

    if (
      mimetype === 'application/pdf' ||
      originalname.toLowerCase().endsWith('.pdf')
    ) {
      const dataBuffer = readFileSync(path);
      const pdfData = await parsePdf(dataBuffer);
      textContent = pdfData.text;
    } else if (
      mimetype === 'text/plain' ||
      mimetype === 'text/markdown' ||
      originalname.toLowerCase().endsWith('.md') ||
      originalname.toLowerCase().endsWith('.txt')
    ) {
      textContent = readFileSync(path, 'utf-8');
    } else {
      return res
        .status(400)
        .json({
          error: 'Unsupported file type. Please upload .txt, .md, or .pdf',
        });
    }

    if (!textContent || textContent.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'Failed to extract text or file is empty.' });
    }

    // Add document to the RAG index dynamically using the stored filename.
    ragService.addDocument(filename, textContent);

    res.json({
      message: 'File uploaded and indexed successfully!',
      filename,
      originalname,
    });
  } catch (error) {
    console.error('[upload] Error processing file:', error);
    res.status(500).json({ error: 'Error processing file: ' + error.message });
  }
};

export const buildUploadListController = (ragService) => async (req, res) => {
  try {
    const supportedExts = ['.pdf', '.md', '.txt'];
    const files = readdirSync(ragService.docsDir)
      .filter(
        (file) =>
          statSync(join(ragService.docsDir, file)).isFile() &&
          supportedExts.includes(extname(file).toLowerCase())
      )
      .sort();
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const buildUploadDeleteController = (ragService) => async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename || basename(filename) !== filename) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }

    const supportedExts = ['.pdf', '.md', '.txt'];
    if (!supportedExts.includes(extname(filename).toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    await ragService.deleteDocument(filename);
    res.json({ message: 'File deleted successfully.', filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
