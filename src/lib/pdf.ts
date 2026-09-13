import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import type { ChangeOrderFull, CompanyProfile, LineItemCategory } from "@/types";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime, sanitizeFilename, REASON_LABELS } from "@/lib/formatters";

const CATEGORY_LABELS: Record<LineItemCategory, string> = {
  labour: "Labour",
  material: "Materials",
  equipment: "Equipment / Other",
  subcontractor: "Subcontractor",
};

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMultiline(s: string | null | undefined): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

function mimeTypeForUri(uri: string): string {
  const clean = uri.toLowerCase().split("?")[0];
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function imageUriToDataUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith("data:image/")) return uri;

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) return null;
    return `data:${mimeTypeForUri(uri)};base64,${base64}`;
  } catch {
    return null;
  }
}

async function prepareImagesForPdf(
  full: ChangeOrderFull,
  company: CompanyProfile
): Promise<{ full: ChangeOrderFull; company: CompanyProfile }> {
  const preparedLogo = await imageUriToDataUri(company.logoUri);

  const preparedPhotos: ChangeOrderFull["photos"] = [];
  for (const photo of full.photos) {
    const source = await imageUriToDataUri(photo.uri);
    if (source) preparedPhotos.push({ ...photo, uri: source });
  }

  let preparedApproval = full.approval;
  if (full.approval) {
    const signature = await imageUriToDataUri(full.approval.signatureUri);
    preparedApproval = signature
      ? { ...full.approval, signatureUri: signature }
      : { ...full.approval, signatureUri: "" };
  }

  return {
    company: { ...company, logoUri: preparedLogo },
    full: {
      ...full,
      photos: preparedPhotos,
      approval: preparedApproval,
    },
  };
}

function lineItemsTableRows(full: ChangeOrderFull, currency: CompanyProfile["currency"]): string {
  const groups: LineItemCategory[] = ["labour", "material", "equipment", "subcontractor"];
  let rows = "";
  for (const g of groups) {
    const items = full.lineItems.filter((li) => li.category === g);
    if (items.length === 0) continue;
    rows += `<tr class="group-row"><td colspan="4">${CATEGORY_LABELS[g]}</td></tr>`;
    for (const li of items) {
      rows += `
        <tr>
          <td class="desc">${escapeHtml(li.description)}</td>
          <td class="num">${li.quantity}</td>
          <td class="num">${formatMoney(li.unitRateCents, currency)}</td>
          <td class="num strong">${formatMoney(li.amountCents, currency)}</td>
        </tr>`;
    }
  }
  if (rows === "") {
    rows = `<tr><td colspan="4" class="desc">No line items recorded.</td></tr>`;
  }
  return rows;
}

function photosHtml(full: ChangeOrderFull): string {
  if (full.photos.length === 0) return "";
  const cells = full.photos
    .map(
      (p) => `
      <div class="photo-cell">
        <img src="${p.uri}" />
        ${p.caption ? `<div class="photo-caption">${escapeHtml(p.caption)}</div>` : ""}
      </div>`
    )
    .join("");
  return `
    <div class="section">
      <div class="section-title">Evidence / Photos</div>
      <div class="photo-grid">${cells}</div>
    </div>`;
}

function approvalHtml(full: ChangeOrderFull): string {
  if (!full.approval) {
    return `
      <div class="section approval-pending">
        <div class="section-title">Approval</div>
        <div class="pending-badge">PENDING APPROVAL</div>
      </div>`;
  }
  const a = full.approval;
  return `
    <div class="section">
      <div class="section-title">Approval</div>
      <div class="approval-grid">
        <div>
          <div class="label">Approved by</div>
          <div class="value">${escapeHtml(a.approverName)}</div>
          <div class="value muted">${escapeHtml(a.approverCompany)}${a.approverTitle ? " · " + escapeHtml(a.approverTitle) : ""}</div>
        </div>
        <div>
          <div class="label">Date</div>
          <div class="value">${formatDateTime(a.approvedAt)}</div>
        </div>
      </div>
      <div class="signature-box">
        ${a.signatureUri ? `<img src="${a.signatureUri}" class="signature-img" />` : `<div class="signature-missing">Signature captured in app</div>`}
        <div class="signature-line">Signature</div>
      </div>
    </div>`;
}

function buildHtml(full: ChangeOrderFull, company: CompanyProfile): string {
  const { changeOrder: co, job, totals } = full;
  const preparedBy = [company.ownerName, company.userRole].filter(Boolean).join(" · ");

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        color: #12161F;
        margin: 0;
        padding: 36px 44px;
        font-size: 13px;
        line-height: 1.45;
      }
      .header {
        display: flex; justify-content: space-between; align-items: flex-start;
        border-bottom: 3px solid #0B4F6C; padding-bottom: 16px; margin-bottom: 24px;
      }
      .company-block { display: flex; align-items: center; gap: 12px; max-width: 62%; }
      .company-logo { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; flex-shrink: 0; }
      .company-name { font-size: 20px; font-weight: 800; color: #0B4F6C; word-break: break-word; }
      .company-meta { font-size: 11.5px; color: #5B6472; margin-top: 2px; }
      .doc-title-block { text-align: right; flex-shrink: 0; }
      .doc-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #12161F; }
      .co-number { font-size: 15px; font-weight: 700; color: #0B4F6C; margin-top: 2px; }
      .status-pill {
        display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 999px;
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .status-draft { background: #EDEEF1; color: #5B6472; }
      .status-sent { background: #E9F1FB; color: #2E6FBE; }
      .status-approved { background: #FCF3DE; color: #B7791F; }
      .status-paid { background: #E5F5EC; color: #1E8E5A; }
      .status-declined { background: #FBEAE8; color: #C0392B; }

      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
      .label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #8A93A2; margin-bottom: 2px; }
      .value { font-size: 13px; font-weight: 600; color: #12161F; word-break: break-word; }
      .value.muted { font-weight: 400; color: #5B6472; }

      .section { margin-bottom: 20px; page-break-inside: avoid; }
      .section-title {
        font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
        color: #0B4F6C; border-bottom: 1px solid #E2E5EA; padding-bottom: 6px; margin-bottom: 10px;
      }
      .description-box { font-size: 13px; color: #12161F; white-space: pre-wrap; word-break: break-word; }

      table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
      table.items th { text-align: left; font-size: 10.5px; text-transform: uppercase; color: #8A93A2; border-bottom: 1px solid #E2E5EA; padding: 6px 4px; }
      table.items td { padding: 7px 4px; border-bottom: 1px solid #F0F1F3; font-size: 12.5px; word-break: break-word; }
      table.items td.num { text-align: right; white-space: nowrap; }
      table.items td.strong { font-weight: 700; }
      table.items td.desc { max-width: 260px; }
      tr.group-row td { font-weight: 700; color: #0B4F6C; padding-top: 12px; border-bottom: none; font-size: 11.5px; text-transform: uppercase; }
      tr { page-break-inside: avoid; }

      .totals { margin-top: 14px; width: 260px; margin-left: auto; }
      .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12.5px; }
      .totals-row.grand { border-top: 2px solid #0B4F6C; margin-top: 8px; padding-top: 10px; font-size: 19px; font-weight: 800; color: #0B4F6C; }

      .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; }
      .photo-cell { width: 150px; page-break-inside: avoid; }
      .photo-cell img { width: 150px; height: 110px; object-fit: cover; border-radius: 6px; border: 1px solid #E2E5EA; }
      .photo-caption { font-size: 10.5px; color: #5B6472; margin-top: 3px; word-break: break-word; }

      .approval-grid { display: flex; justify-content: space-between; margin-bottom: 14px; }
      .pending-badge { display: inline-block; background: #FCF3DE; color: #B7791F; font-weight: 800; padding: 6px 14px; border-radius: 6px; letter-spacing: 0.5px; font-size: 12px; }
      .signature-box { border: 1px solid #E2E5EA; border-radius: 8px; padding: 10px; width: 260px; page-break-inside: avoid; }
      .signature-img { width: 100%; height: 70px; object-fit: contain; }
      .signature-missing { height: 70px; display: flex; align-items: center; justify-content: center; color: #8A93A2; font-size: 10.5px; }
      .signature-line { border-top: 1px solid #12161F; margin-top: 4px; padding-top: 4px; font-size: 10.5px; color: #5B6472; }

      .disclaimer { font-size: 10.5px; color: #8A93A2; margin-top: 26px; border-top: 1px solid #E2E5EA; padding-top: 12px; }
      .footer { font-size: 10px; color: #8A93A2; margin-top: 8px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-block">
        ${company.logoUri ? `<img class="company-logo" src="${company.logoUri}" />` : ""}
        <div>
          <div class="company-name">${escapeHtml(company.companyName)}</div>
          <div class="company-meta">
            ${preparedBy ? `Prepared by ${escapeHtml(preparedBy)}<br/>` : ""}
            ${escapeHtml(company.trade)}${company.trade ? "<br/>" : ""}
            ${escapeHtml(company.address)}${company.address && company.city ? ", " : ""}${escapeHtml(company.city)} ${escapeHtml(company.region)} ${escapeHtml(company.postalCode)}<br/>
            ${escapeHtml(company.phone)}${company.phone && company.email ? " · " : ""}${escapeHtml(company.email)}
            ${company.licenseNumber ? `<br/>License #${escapeHtml(company.licenseNumber)}` : ""}
          </div>
        </div>
      </div>
      <div class="doc-title-block">
        <div class="doc-title">CHANGE ORDER</div>
        <div class="co-number">${escapeHtml(co.number)}</div>
        <div class="status-pill status-${co.status}">${co.status}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="label">Project</div>
        <div class="value">${escapeHtml(job.name)}</div>
        <div class="value muted">${escapeHtml(job.address)}</div>
      </div>
      <div>
        <div class="label">Customer / GC</div>
        <div class="value">${escapeHtml(job.customerName)}</div>
        <div class="value muted">${escapeHtml(job.gcName)}</div>
      </div>
      <div>
        <div class="label">Requested by</div>
        <div class="value">${escapeHtml(co.requestedByName)}</div>
        <div class="value muted">${escapeHtml(co.requestedByCompany)}${co.requestedByRole ? " · " + escapeHtml(co.requestedByRole) : ""}</div>
      </div>
      <div>
        <div class="label">Date requested</div>
        <div class="value">${formatDate(co.requestedAt)}</div>
        <div class="value muted">Reason: ${REASON_LABELS[co.reason] ?? co.reason}</div>
      </div>
      <div>
        <div class="label">Created</div>
        <div class="value">${formatDate(co.createdAt)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Description of Additional Work</div>
      <div class="description-box">${escapeHtml(co.title)}</div>
      <div class="description-box" style="margin-top:6px;color:#5B6472;">${escapeMultiline(co.description)}</div>
      ${co.siteNotes ? `<div class="description-box" style="margin-top:6px;"><b>Site notes:</b> ${escapeMultiline(co.siteNotes)}</div>` : ""}
    </div>

    <div class="section">
      <div class="section-title">Pricing</div>
      <table class="items">
        <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
        <tbody>${lineItemsTableRows(full, company.currency)}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${formatMoney(totals.subtotalCents, company.currency)}</span></div>
        ${totals.markupCents > 0 ? `<div class="totals-row"><span>Markup</span><span>${formatMoney(totals.markupCents, company.currency)}</span></div>` : ""}
        ${totals.discountCents > 0 ? `<div class="totals-row"><span>Discount</span><span>-${formatMoney(totals.discountCents, company.currency)}</span></div>` : ""}
        ${co.taxEnabled ? `<div class="totals-row"><span>${escapeHtml(co.taxLabel)}</span><span>${formatMoney(totals.taxCents, company.currency)}</span></div>` : ""}
        <div class="totals-row grand"><span>TOTAL</span><span>${formatMoney(totals.totalCents, company.currency)}</span></div>
      </div>
    </div>

    ${photosHtml(full)}
    ${approvalHtml(full)}

    <div class="disclaimer">
      ${escapeHtml(
        company.pdfFooterNote ||
          "This change order documents work outside the original agreed scope. Approval confirms authorization of the work and associated amount shown above."
      )}
    </div>
    <div class="footer">Generated by GetYourExtra · ${formatDateTime(new Date().toISOString())}</div>
  </body>
  </html>`;
}

export async function generateChangeOrderPdf(
  full: ChangeOrderFull,
  company: CompanyProfile
): Promise<{ uri: string; filename: string }> {
  if (!full.lineItems || full.lineItems.length === 0) {
    throw new Error("This change order has no line items to include in the PDF.");
  }

  const prepared = await prepareImagesForPdf(full, company);
  const html = buildHtml(prepared.full, prepared.company);

  let printResult: { uri: string };
  try {
    printResult = await Print.printToFileAsync({ html, base64: false });
  } catch (e: any) {
    throw new Error(`Couldn't render the PDF: ${e?.message ?? "unknown rendering error"}.`);
  }

  const dollars = (full.totals.totalCents / 100).toFixed(2);
  const filename = `${sanitizeFilename(full.changeOrder.number)}-${sanitizeFilename(full.job.name)}-${dollars}.pdf`;
  const destUri = `${FileSystem.documentDirectory}${filename}`;

  try {
    await FileSystem.copyAsync({ from: printResult.uri, to: destUri });
  } catch {
    return { uri: printResult.uri, filename };
  }

  return { uri: destUri, filename };
}
