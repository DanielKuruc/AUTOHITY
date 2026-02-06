import { Share, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Purchase, PurchaseState } from '@/constants/types';

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
Typ:                   ${purchase.clientType === 'PERSONAL' ? 'Fyzická osoba' : 'Firma'}
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
          <span class="info-value">${purchase.clientType === 'PERSONAL' ? 'Fyzická osoba' : 'Firma'}</span>
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
    console.error('[ExportService] Chyba při generování PDF:', error);
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
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Výkup ${purchase.carDetails?.make} ${purchase.carDetails?.model}`,
      });
    } else {
      await Share.share({ url: pdfPath });
    }
  } catch (error) {
    console.error('[ExportService] Chyba při sdílení:', error);
    Alert.alert('Chyba', 'Nepodařilo se sdílet detail výkupu');
  }
};

export const sharePurchasesList = async (purchases: Purchase[], periodName: string) => {
  try {
    const summaryText = `
VÝKUPY - ${periodName}
Celkem: ${purchases.length}
Vygenerováno: ${new Date().toLocaleString('cs-CZ')}

${purchases.map(p => `• ${p.carDetails?.make} ${p.carDetails?.model} (${p.spz}) - ${formatCurrency(p.totalAmount)}`).join('\n')}
    `.trim();

    await Share.share({
      message: summaryText,
      title: `Přehled výkupů - ${periodName}`,
    });
  } catch (error) {
    console.error('[ExportService] Chyba při sdílení seznamu:', error);
    Alert.alert('Chyba', 'Nepodařilo se sdílet seznam výkupů');
  }
};