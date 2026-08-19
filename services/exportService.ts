import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Purchase, PurchaseState } from '@/constants/types';
import { showAlert } from '@/utils/alert';

const formatCurrency = (amount?: number | null) => {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('cs-CZ');
    }
  } catch (e) {}
  return dateString;
};

const getStateText = (state: PurchaseState) => {
  switch (state) {
    case PurchaseState.NEW: return 'Nový';
    case PurchaseState.IN_PROGRESS: return 'Probíhá';
    case PurchaseState.COMPLETED: return 'Dokončen';
    case PurchaseState.CANCELLED: return 'Zrušen';
    default: return state;
  }
};

export const generatePurchaseText = (purchase: Purchase): string => {
  return `
═════════════════════════════════════════════════════════════
                    DETAIL VÝKUPU
═════════════════════════════════════════════════════════════

ZÁKLADNÍ INFORMACE
─────────────────────────────────────────────────────────────
Stav výkupu:           ${getStateText(purchase.purchaseState)}
ID výkupu:             ${purchase.id}
Datum výkupu:          ${formatDate(purchase.purchaseDate)}
Datum prohlídky:       ${formatDate(purchase.inspectionDate)}

VOZIDLO
─────────────────────────────────────────────────────────────
Značka:                ${purchase.carDetails?.make || 'N/A'}
Model:                 ${purchase.carDetails?.model || 'N/A'}
Rok výroby:            ${purchase.carDetails?.year || 'N/A'}
VIN:                   ${purchase.carDetails?.vin || 'N/A'}
Registrační značka:    ${purchase.spz}
Palivo:                ${purchase.carDetails?.fuelType || 'N/A'}
Výkon:                 ${purchase.carDetails?.engineSize || 'N/A'}
Kilometrů:             ${purchase.carDetails?.mileage?.toLocaleString('cs-CZ') || 'N/A'}
Barva:                 ${purchase.carDetails?.color || 'N/A'}
Převodovka:            ${purchase.carDetails?.transmission || 'N/A'}
Karoserie:             ${purchase.carDetails?.bodyType || 'N/A'}
Pohon:                 ${purchase.carDetails?.driveType || 'N/A'}
STK do:                ${formatDate(purchase.carDetails?.stk)}
Do provozu:            ${formatDate(purchase.carDetails?.firstRegistration)}
Dovoz:                 ${purchase.carDetails?.isImport ? 'Ano' : 'Ne'}
První majitel:         ${purchase.carDetails?.isFirstOwner ? 'Ano' : 'Ne'}
Servisní knížka:       ${purchase.carDetails?.hasServiceBook ? 'Ano' : 'Ne'}

KLIENT
─────────────────────────────────────────────────────────────
Jméno:                 ${purchase.clientName}
Typ:                   ${purchase.clientType === 'person' ? 'Fyzická osoba' : 'Firma'}
Telefon:               ${purchase.phone || 'N/A'}
${purchase.companyInfo ? `IČO:                   ${purchase.companyInfo.ico || 'N/A'}\n` : ''}${purchase.companyInfo ? `DIČ:                   ${purchase.companyInfo.dic || 'N/A'}\n` : ''}
Ulice:                 ${purchase.street || 'N/A'}
Město:                 ${purchase.city || 'N/A'}
PSČ:                   ${purchase.postalCode || 'N/A'}
Plátce DPH:            ${purchase.isVatPayer ? 'Ano' : 'Ne'}

FINANČNÍ ÚDAJE
─────────────────────────────────────────────────────────────
Cena od zákazníka:     ${formatCurrency(purchase.customerPrice)}
Cena nabídnuta:        ${formatCurrency(purchase.offeredPrice)}
Cena výkupu:           ${formatCurrency(purchase.totalAmount)}
Předpokl. cena prodeje: ${formatCurrency(purchase.expectedSalePrice)}
Protiúčet:             ${purchase.isCounterAccount ? 'Ano' : 'Ne'}

POZNÁMKY
─────────────────────────────────────────────────────────────
${purchase.notes || 'Bez poznámek'}

═════════════════════════════════════════════════════════════
Vygenerováno: ${new Date().toLocaleString('cs-CZ')}
═════════════════════════════════════════════════════════════
  `.trim();
};

export const generatePurchaseHTML = (purchase: Purchase): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #e30613;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #e30613;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      background: #f0f0f0;
      padding: 10px 15px;
      margin: 0 0 15px 0;
      border-left: 4px solid #e30613;
      font-weight: bold;
      font-size: 14px;
      color: #333;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px 30px;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .info-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
    }
    .info-value {
      text-align: right;
      color: #333;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      background: #e30613;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #999;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DETAIL VÝKUPU</h1>
      <p>Autohity výkup</p>
    </div>

    <div class="status-badge">${getStateText(purchase.purchaseState)}</div>

    <div class="section">
      <div class="section-title">ZÁKLADNÍ INFORMACE</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">ID výkupu:</span>
          <span class="info-value">${purchase.id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Datum výkupu:</span>
          <span class="info-value">${formatDate(purchase.purchaseDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Datum prohlídky:</span>
          <span class="info-value">${formatDate(purchase.inspectionDate)}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">VOZIDLO</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Značka:</span>
          <span class="info-value">${purchase.carDetails?.make || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Model:</span>
          <span class="info-value">${purchase.carDetails?.model || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rok výroby:</span>
          <span class="info-value">${purchase.carDetails?.year || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">VIN:</span>
          <span class="info-value">${purchase.carDetails?.vin || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">SPZ:</span>
          <span class="info-value">${purchase.spz}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Palivo:</span>
          <span class="info-value">${purchase.carDetails?.fuelType || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Výkon:</span>
          <span class="info-value">${purchase.carDetails?.engineSize || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kilometrů:</span>
          <span class="info-value">${purchase.carDetails?.mileage?.toLocaleString('cs-CZ') || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Barva:</span>
          <span class="info-value">${purchase.carDetails?.color || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Převodovka:</span>
          <span class="info-value">${purchase.carDetails?.transmission || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Karoserie:</span>
          <span class="info-value">${purchase.carDetails?.bodyType || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Pohon:</span>
          <span class="info-value">${purchase.carDetails?.driveType || 'N/A'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">KLIENT</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Jméno:</span>
          <span class="info-value">${purchase.clientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Typ:</span>
          <span class="info-value">${purchase.clientType === 'person' ? 'Fyzická osoba' : 'Firma'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefon:</span>
          <span class="info-value">${purchase.phone || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Město:</span>
          <span class="info-value">${purchase.city || 'N/A'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">FINANČNÍ ÚDAJE</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Cena od zákazníka:</span>
          <span class="info-value">${formatCurrency(purchase.customerPrice)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cena nabídnuta:</span>
          <span class="info-value">${formatCurrency(purchase.offeredPrice)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cena výkupu:</span>
          <span class="info-value">${formatCurrency(purchase.totalAmount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Předpokl. prodej:</span>
          <span class="info-value">${formatCurrency(purchase.expectedSalePrice)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      Vygenerováno: ${new Date().toLocaleString('cs-CZ')}
    </div>
  </div>
</body>
</html>
  `;
};

export const generateCSV = (purchases: Purchase[]): string => {
  const headers = [
    'ID',
    'Stav',
    'Klient',
    'Značka',
    'Model',
    'SPZ',
    'Datum výkupu',
    'Cena výkupu',
    'Kilometrů',
    'Telefon',
  ];

  const rows = purchases.map(p => [
    p.id,
    getStateText(p.purchaseState),
    p.clientName,
    p.carDetails?.make || '',
    p.carDetails?.model || '',
    p.spz,
    formatDate(p.purchaseDate),
    p.totalAmount?.toString() || '',
    p.carDetails?.mileage?.toString() || '',
    p.phone || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
};

export const generatePurchasePDF = async (purchase: Purchase): Promise<string | null> => {
  try {
    const html = generatePurchaseHTML(purchase);
    const fileName = `vykup_${purchase.spz.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    if (Platform.OS === 'web') {
      // Web: nemůžeme generovat nativní PDF – sdílíme text
      return null;
    }

    // Native: vygeneruj skutečné PDF z HTML
    const { uri } = await Print.printToFileAsync({ html });
    const targetPath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.moveAsync({ from: uri, to: targetPath });
    return targetPath;
  } catch (error) {
    return null;
  }
};

export const sharePurchaseDetail = async (purchase: Purchase) => {
  try {
    // Pokud je web, sdílíme text
    if (Platform.OS === 'web') {
      const text = generatePurchaseText(purchase);
      await Share.share({
        message: text,
        title: `Výkup ${purchase.carDetails?.make} ${purchase.carDetails?.model} (${purchase.spz})`,
      });
      return;
    }

    // Native: generuj a sdílej pouze PDF
    const pdfPath = await generatePurchasePDF(purchase);
    if (!pdfPath) {
      const textFallback = generatePurchaseText(purchase);
      await Share.share({ message: textFallback });
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `Výkup ${purchase.carDetails?.make} ${purchase.carDetails?.model}`,
        });
      } else {
        await Share.share({ url: pdfPath });
      }
    } finally {
      await FileSystem.deleteAsync(pdfPath, { idempotent: true });
    }
  } catch (error) {
    showAlert('Chyba', 'Nepodařilo se sdílet detail výkupu');
  }
};

export const generatePurchasesListHTML = (purchases: Purchase[], periodName: string): string => {
  const totalValue = purchases.reduce((sum, p) => {
    let amount = 0;
    if (typeof p.totalAmount === 'number') {
      amount = p.totalAmount;
    } else if (typeof p.totalAmount === 'string' && p.totalAmount) {
      const parsed = parseFloat((p.totalAmount as string).replace(',', '.'));
      amount = isNaN(parsed) ? 0 : parsed;
    }
    return sum + amount;
  }, 0);

  const completedCount = purchases.filter(p => p.purchaseState === PurchaseState.COMPLETED).length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #e30613;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #e30613;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .summary {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #e30613;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-top: 15px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #e30613;
    }
    .summary-label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .table th {
      background: #f0f0f0;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #e30613;
      font-size: 12px;
    }
    .table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e5e5;
      font-size: 12px;
    }
    .table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
    }
    .status-completed {
      background: #d4edda;
      color: #155724;
    }
    .status-progress {
      background: #fff3cd;
      color: #856404;
    }
    .status-new {
      background: #cfe2ff;
      color: #084298;
    }
    .status-cancelled {
      background: #f8d7da;
      color: #721c24;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #999;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${periodName.toUpperCase()}</h1>
      <p>Autohity výkup - Přehled výkupů</p>
    </div>

    <div class="summary">
      <div style="font-weight: bold; color: #333;">SOUHRN</div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${purchases.length}</div>
          <div class="summary-label">Výkupů celkem</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${completedCount}</div>
          <div class="summary-label">Dokončeno</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${formatCurrency(totalValue)}</div>
          <div class="summary-label">Celková hodnota</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${purchases.length > 0 ? (completedCount / purchases.length * 100).toFixed(0) : 0}%</div>
          <div class="summary-label">Úspěšnost</div>
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Stav</th>
          <th>Klient</th>
          <th>Vozidlo</th>
          <th>SPZ</th>
          <th>Datum výkupu</th>
          <th>Cena výkupu</th>
          <th>Km</th>
        </tr>
      </thead>
      <tbody>
        ${purchases.map(p => {
          const statusClass = p.purchaseState === PurchaseState.COMPLETED ? 'status-completed' :
                            p.purchaseState === PurchaseState.IN_PROGRESS ? 'status-progress' :
                            p.purchaseState === PurchaseState.NEW ? 'status-new' : 'status-cancelled';
          return `
          <tr>
            <td><span class="status ${statusClass}">${getStateText(p.purchaseState)}</span></td>
            <td>${p.clientName}</td>
            <td>${p.carDetails?.make || ''} ${p.carDetails?.model || ''}</td>
            <td>${p.spz}</td>
            <td>${formatDate(p.purchaseDate)}</td>
            <td>${formatCurrency(p.totalAmount)}</td>
            <td>${p.carDetails?.mileage?.toLocaleString('cs-CZ') || 'N/A'}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="footer">
      Vygenerováno: ${new Date().toLocaleString('cs-CZ')}
    </div>
  </div>
</body>
</html>
  `;
};

export const generatePurchasesListPDF = async (purchases: Purchase[], periodName: string): Promise<string | null> => {
  try {
    const html = generatePurchasesListHTML(purchases, periodName);
    const fileName = `report_${periodName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    if (Platform.OS === 'web') {
      return null;
    }

    const { uri } = await Print.printToFileAsync({ html });
    const targetPath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.moveAsync({ from: uri, to: targetPath });
    return targetPath;
  } catch (error) {
    return null;
  }
};

export const sharePurchasesList = async (purchases: Purchase[], periodName: string) => {
  try {
    if (Platform.OS === 'web') {
      // Web: generuj HTML a stáhni jako HTML soubor, nebo otevři v nové záložce
      const html = generatePurchasesListHTML(purchases, periodName);
      const fileName = `report_${periodName.replace(/\s+/g, '_')}_${Date.now()}.html`;
      // Vytvoř blob a stáhni
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Native: generuj a sdílej PDF
    const pdfPath = await generatePurchasesListPDF(purchases, periodName);
    if (!pdfPath) {
      const textFallback = `
VÝKUPY - ${periodName}
Celkem: ${purchases.length}
Vygenerováno: ${new Date().toLocaleString('cs-CZ')}

${purchases.map(p => `• ${p.carDetails?.make} ${p.carDetails?.model} (${p.spz}) - ${formatCurrency(p.totalAmount)}`).join('\n')}
      `.trim();
      await Share.share({ message: textFallback });
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `Přehled výkupů - ${periodName}`,
        });
      } else {
        await Share.share({ url: pdfPath });
      }
    } finally {
      await FileSystem.deleteAsync(pdfPath, { idempotent: true });
    }
  } catch (error) {
    showAlert('Chyba', 'Nepodařilo se exportovat report');
  }
};

export const generateCompleteReportHTML = (reportData: any, periodName: string): string => {
  const formatCurrencyValue = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const topSuppliers = reportData.topSuppliers || [];
  const topEmployees = reportData.topEmployees || [];
  const topMakes = reportData.topMakes || [];

  const supplierTotal = topSuppliers.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
  const employeeTotal = topEmployees.reduce((sum: number, e: any) => sum + (e.value || 0), 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #10b981;
      padding-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: #1f2937;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header .period {
      color: #6b7280;
      font-size: 15px;
      margin-bottom: 5px;
    }
    .header .dates {
      color: #9ca3af;
      font-size: 13px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-item {
      padding: 20px;
      background: #f3f4f6;
      border-radius: 10px;
      border-left: 4px solid #10b981;
    }
    .summary-value {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #1f2937;
    }
    .table tr:last-child td {
      border-bottom: none;
    }
    .table-row-bold {
      font-weight: 700;
      background: #f9fafb;
    }
    .table-row-bold td {
      padding-top: 15px;
      padding-bottom: 15px;
      border-top: 2px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-completed {
      background: #d1fae5;
      color: #065f46;
    }
    .status-progress {
      background: #fed7aa;
      color: #92400e;
    }
    .status-new {
      background: #dbeafe;
      color: #0c2d6b;
    }
    .status-cancelled {
      background: #fee2e2;
      color: #7f1d1d;
    }
    .value-positive {
      color: #059669;
      font-weight: 600;
    }
    .value-secondary {
      color: #6b7280;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .metric-label {
      color: #374151;
      font-weight: 500;
    }
    .metric-value {
      color: #059669;
      font-weight: 700;
      font-size: 16px;
    }
    .metric-row.total {
      border-top: 2px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      padding: 18px 0;
      margin-top: 10px;
    }
    .metric-row.total .metric-label,
    .metric-row.total .metric-value {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Report Výkupů</h1>
      <div class="period">${periodName}</div>
      <div class="dates">${reportData.startDate} - ${reportData.endDate}</div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${reportData.total}</div>
        <div class="summary-label">Výkupů celkem</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${reportData.byState.completed}</div>
        <div class="summary-label">Dokončeno</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${(reportData.successRate || 0).toFixed(0)}%</div>
        <div class="summary-label">Úspěšnost</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${formatCurrencyValue(reportData.completedValue)}</div>
        <div class="summary-label">Celková hodnota</div>
      </div>
    </div>

    ${topSuppliers.length > 0 ? `
    <div class="section">
      <div class="section-title">DODAVATELÉ</div>
      <div class="table" style="border-collapse: collapse;">
        ${topSuppliers.map((supplier: any) => `
        <div class="metric-row">
          <span class="metric-label">${supplier.name}</span>
          <span class="metric-value">${formatCurrencyValue(supplier.value)}</span>
        </div>
        `).join('')}
        <div class="metric-row total">
          <span class="metric-label">Celkem dodavatelé</span>
          <span class="metric-value">${formatCurrencyValue(supplierTotal)}</span>
        </div>
      </div>
    </div>
    ` : ''}

    ${topEmployees.length > 0 ? `
    <div class="section">
      <div class="section-title">VÝKUPY PODLE VÝKUPČÍHO</div>
      <div class="table" style="border-collapse: collapse;">
        ${topEmployees.map((employee: any) => `
        <div class="metric-row">
          <div style="flex: 1;">
            <div class="metric-label">${employee.name}</div>
            <div style="color: #10b981; font-size: 12px; margin-top: 2px;">
              <span style="color: #10b981; font-weight: 700;">${employee.completed}</span>
              <span style="color: #9ca3af;">/ ${employee.count}</span>
            </div>
          </div>
          <span class="metric-value">${formatCurrencyValue(employee.value)}</span>
        </div>
        `).join('')}
        <div class="metric-row total">
          <span class="metric-label">Celkem výkupčí</span>
          <span class="metric-value">${formatCurrencyValue(employeeTotal)}</span>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">FINANČNÍ SOUHRN</div>
      <div class="metric-row">
        <span class="metric-label">Dokončené výkupy</span>
        <span class="metric-value">${formatCurrencyValue(reportData.completedValue)}</span>
      </div>
    </div>

    ${topMakes.length > 0 ? `
    <div class="section">
      <div class="section-title">TOP ZNAČKY VOZIDEL</div>
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Značka</th>
            <th>Vykoupeno</th>
          </tr>
        </thead>
        <tbody>
          ${topMakes.slice(0, 15).map((item: any, index: number) => `
          <tr>
            <td style="width: 40px; text-align: center; color: #9ca3af; font-weight: 600;">${index + 1}</td>
            <td>${item.make}</td>
            <td>
              <span style="color: #10b981; font-weight: 700;">${item.completed}</span>
              <span style="color: #9ca3af;">/ ${item.total}</span>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <div style="margin-bottom: 8px;">Report vygenerován: ${new Date().toLocaleString('cs-CZ')}</div>
      <div style="color: #d1d5db;">Autohity výkup © 2024</div>
    </div>
  </div>
</body>
</html>
  `;
};

export const generateCompleteReportPDF = async (reportData: any, periodName: string): Promise<string | null> => {
  try {
    const html = generateCompleteReportHTML(reportData, periodName);
    const fileName = `report_${periodName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    if (Platform.OS === 'web') {
      return null;
    }

    const { uri } = await Print.printToFileAsync({ html });
    const targetPath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.moveAsync({ from: uri, to: targetPath });
    return targetPath;
  } catch (error) {
    return null;
  }
};

export const shareCompleteReport = async (reportData: any, periodName: string) => {
  try {
    if (Platform.OS === 'web') {
      const html = generateCompleteReportHTML(reportData, periodName);
      const fileName = `report_${periodName.replace(/\s+/g, '_')}_${Date.now()}.html`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const pdfPath = await generateCompleteReportPDF(reportData, periodName);
    if (!pdfPath) {
      throw new Error('Failed to generate PDF');
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `Přehled výkupů - ${periodName}`,
        });
      } else {
        await Share.share({ url: pdfPath });
      }
    } finally {
      await FileSystem.deleteAsync(pdfPath, { idempotent: true });
    }
  } catch (error) {
    showAlert('Chyba', 'Nepodařilo se exportovat report');
  }
};