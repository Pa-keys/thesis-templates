export function printHtmlDocument(html: string) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const cleanup = () => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    };

    const printWindow = iframe.contentWindow;
    const iframeDoc = printWindow?.document;

    if (!printWindow || !iframeDoc) {
        cleanup();
        return false;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const fallbackCleanup = window.setTimeout(cleanup, 3000);
    printWindow.onafterprint = () => {
        window.clearTimeout(fallbackCleanup);
        cleanup();
    };

    window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);

    return true;
}
