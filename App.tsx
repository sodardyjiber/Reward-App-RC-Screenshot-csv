import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultsTable } from './components/ResultsTable';
import { extractDataFromImage } from './services/geminiService';
import { TableRow, ProcessingState, ExtractionStatus } from './types';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const FIXED_HEADERS = [
  "日期",
  "兑换第三方奖賞积分所得",
  "推广",
  "Travel Guru会员计划",
  "汇丰Pulse银联双币卡额外奖赏",
  "最红自主奖赏",
  "基本消费",
  "您已赚取"
];

function App() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: ExtractionStatus.IDLE
  });

  const headers = FIXED_HEADERS;

  const handleImagesSelected = useCallback(async (images: { base64: string, fileName: string }[]) => {
    if (images.length === 0) return;

    setProcessingState({ status: ExtractionStatus.PROCESSING, message: `Starting processing of ${images.length} image(s)...` });
    
    let processedCount = 0;
    const errors: string[] = [];

    // We process sequentially to provide clear feedback and ensure we don't overwhelm the API
    for (let i = 0; i < images.length; i++) {
        const { base64, fileName } = images[i];
        setProcessingState({ 
          status: ExtractionStatus.PROCESSING, 
          message: `Processing ${i + 1} of ${images.length}: ${fileName}` 
        });

        try {
          // Pass existing headers to help Gemini normalize data to existing columns.
          const newData = await extractDataFromImage(base64, headers);
          
          const newRow: TableRow = {
            id: generateId(),
            data: newData,
            sourceImageName: fileName,
            timestamp: new Date().toISOString()
          };

          setRows(prev => [...prev, newRow]);
          processedCount++;
        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          errors.push(fileName);
        }

        // Throttle requests significantly to prevent hitting rate limits immediately,
        // unless it's the last item.
        if (i < images.length - 1) {
          // Increased to 5000ms (5 seconds) to stay well within free tier RPM limits
          await new Promise(resolve => setTimeout(resolve, 5000)); 
        }
    }

    if (processedCount > 0) {
      const errorMsg = errors.length > 0 ? ` (${errors.length} failed)` : '';
      setProcessingState({ 
        status: ExtractionStatus.SUCCESS, 
        message: `Successfully processed ${processedCount} of ${images.length} images${errorMsg}.` 
      });
    } else {
      setProcessingState({ status: ExtractionStatus.ERROR, message: 'Failed to process selected images.' });
    }
    
    // Reset status after a delay
    setTimeout(() => {
      setProcessingState({ status: ExtractionStatus.IDLE });
    }, 4000);

  }, [headers]);

  const copyToClipboard = () => {
    if (rows.length === 0) return;

    // TSV format is best for pasting into Google Sheets/Excel
    const headerRow = headers.join('\t');
    const dataRows = rows.map(row => {
      return headers.map(header => {
        const val = row.data[header];
        // Clean up newlines or tabs in data to prevent breaking the copy paste
        return val ? String(val).replace(/[\t\n\r]/g, ' ') : '';
      }).join('\t');
    }).join('\n');

    const tsv = `${headerRow}\n${dataRows}`;
    navigator.clipboard.writeText(tsv);
    alert('Copied to clipboard! Open Google Sheets/Excel and Paste (Ctrl+V).');
  };

  const downloadCSV = () => {
     if (rows.length === 0) return;

    // CSV format handling quotes and commas
    const escapeCsv = (val: any) => {
       if (val === null || val === undefined) return '';
       const str = String(val);
       if (str.includes(',') || str.includes('"') || str.includes('\n')) {
         return `"${str.replace(/"/g, '""')}"`;
       }
       return str;
    };

    const headerRow = headers.map(escapeCsv).join(',');
    const dataRows = rows.map(row => {
      return headers.map(header => escapeCsv(row.data[header])).join(',');
    }).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headerRow}\n${dataRows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "extracted_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetTable = () => {
    if(confirm("Are you sure you want to clear the table? This cannot be undone.")) {
      setRows([]);
      setProcessingState({ status: ExtractionStatus.IDLE });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 rounded-md p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 18.375V5.625ZM21 9.375A.375.375 0 0 0 20.625 9h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5ZM10.875 18.75a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5ZM3.375 15h7.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375Zm0-3.75h7.5a.375.375 0 0 0 .375-.375v-1.5A.375.375 0 0 0 10.875 9h-7.5A.375.375 0 0 0 3 9.375v1.5c0 .207.168.375.375.375Z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Snap2Sheet</h1>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={resetTable}
              disabled={rows.length === 0}
              className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-500 px-3 py-2 transition-colors"
            >
              Clear
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <button
              onClick={copyToClipboard}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Copy to Sheets
            </button>
            <button
              onClick={downloadCSV}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-green-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Download CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar / Upload Area */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Add Data</h2>
            <p className="text-sm text-gray-500 mb-4">Upload receipts, invoices, or documents.</p>
            
            <ImageUploader 
              onImagesSelected={handleImagesSelected} 
              disabled={processingState.status === ExtractionStatus.PROCESSING} 
            />

            {processingState.status !== ExtractionStatus.IDLE && (
              <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 text-sm
                ${processingState.status === ExtractionStatus.PROCESSING ? 'bg-blue-50 text-blue-700' : ''}
                ${processingState.status === ExtractionStatus.SUCCESS ? 'bg-green-50 text-green-700' : ''}
                ${processingState.status === ExtractionStatus.ERROR ? 'bg-red-50 text-red-700' : ''}
              `}>
                {processingState.status === ExtractionStatus.PROCESSING && (
                  <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {processingState.status === ExtractionStatus.SUCCESS && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                )}
                {processingState.status === ExtractionStatus.ERROR && (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
                     <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                   </svg>
                )}
                <span className="leading-5">{processingState.message}</span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
             <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
             <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
               <li>Upload any image containing data.</li>
               <li>AI extracts text into columns.</li>
               <li>Data is mapped to 8 specific columns.</li>
               <li>Copy to Google Sheets when done.</li>
             </ol>
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 flex flex-col min-h-[500px]">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold text-gray-900">Collected Data</h2>
           </div>
           <div className="flex-1">
             <ResultsTable rows={rows} headers={headers} />
           </div>
        </div>

      </main>
    </div>
  );
}

export default App;