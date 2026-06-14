const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const blob = new Blob(
    [
      [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
        "\n",
      ),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  downloadBlob(blob, `${filename}.csv`);
}

export function downloadExcel(filename: string, headers: string[], rows: unknown[][]) {
  const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  const blob = new Blob([`<html><head><meta charset="UTF-8"></head><body>${table}</body></html>`], {
    type: "application/vnd.ms-excel",
  });
  downloadBlob(blob, `${filename}.xls`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
