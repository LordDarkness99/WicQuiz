export interface ResultsPdfEntry {
  player_name: string;
  score: number;
}

/**
 * Builds a print-ready results sheet and opens the browser's print dialog
 * so the host can "Save as PDF" — no extra client-side PDF library needed.
 */
export function downloadResultsAsPdf(
  quizTitle: string,
  entries: ResultsPdfEntry[],
  totalQuestions: number
) {
  const rows = entries
    .map(
      (e, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td class="name">${escapeHtml(e.player_name)}</td>
          <td class="score">${e.score.toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(quizTitle)} — Final Results</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1B2B5E; margin: 40px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #667; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #667; }
  td.rank { width: 48px; font-weight: 700; }
  td.score { text-align: right; font-weight: 700; }
  tr:nth-child(1) td { font-weight: 800; }
  @media print {
    @page { margin: 24mm 18mm; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(quizTitle)} — Final Results</h1>
  <div class="meta">Total players: ${entries.length} &nbsp;•&nbsp; Total questions: ${totalQuestions}</div>
  <table>
    <thead><tr><th>#</th><th>Name</th><th style="text-align:right">Score</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=800,height=1000");
  if (!printWindow) {
    // Popup blocked — fall back to a plain-text download so the host
    // always gets *something* to take away.
    const blob = new Blob(
      [
        `${quizTitle} — Final Results\n${"=".repeat(40)}\n\n` +
          entries
            .map((e, i) => `${i + 1}. ${e.player_name} — ${e.score.toLocaleString()} pts`)
            .join("\n") +
          `\n\nTotal players: ${entries.length}\nTotal questions: ${totalQuestions}`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quizTitle.replace(/\s+/g, "_")}_results.txt`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
