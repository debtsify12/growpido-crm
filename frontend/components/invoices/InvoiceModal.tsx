'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, Invoice, InvoiceItem, InvoiceStatus, AgencyDetails, ClientDetails } from '@/lib/types';
import { invoicesApi, leadsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface ExtendedAgencyDetails extends AgencyDetails {
  account_name?: string;
  swift_code?: string;
  signatory_name?: string;
  pan?: string;
  tagline?: string;
}

interface InvoiceModalProps {
  client?: Lead | null;
  existingInvoice?: Invoice | null;
  onClose: () => void;
  onSaved: (invoice: Invoice) => void;
}

const GROWPIDO_DEFAULTS: ExtendedAgencyDetails = {
  name: 'GROWPIDO',
  tagline: 'BUILD. POSITION. GROW.',
  email: 'founder@growpido.com',
  phone: '+91 99999 09330',
  address: '4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102',
  gst: '06AAAAA0000A1Z5',
  pan: 'ABCDE1234F',
  bank_name: 'Axis Bank',
  account_name: 'Ajit Singh',
  account_number: '910010040802885',
  ifsc: 'UTIB0000039',
  swift_code: 'AXISINBB0039',
  upi_id: 'founder@growpido',
  signatory_name: 'Ajit Singh',
};

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'AED', symbol: 'AED ', label: 'AED (Dirhams)' },
];

const PRESET_DELIVERABLES = [
  { title: 'LinkedIn Personal Branding & Executive Content Engine', desc: '12 high-impact thought leadership posts, ghostwriting, profile optimization & engagement strategy (30 Days)', price: 1100 },
  { title: 'Custom AI Agent Architecture & Growth Automation Setup', desc: 'End-to-end bespoke AI agent integration, lead qualification workflows, CRM syncing & custom LLM fine-tuning', price: 2500 },
  { title: 'Executive Reputation Management & Content Retainer', desc: 'Full-service PR, tier-1 media positioning, LinkedIn viral hooks & personal brand growth acceleration (Monthly)', price: 1800 },
  { title: 'Cold Outbound & Sales Pipeline Automation System', desc: 'Multi-channel outbound infrastructure, verified lead scraping, email warmup & AI SDR automation', price: 1500 },
];

export default function InvoiceModal({
  client,
  existingInvoice,
  onClose,
  onSaved,
}: InvoiceModalProps) {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'editor'>('split');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Leads for selection
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(client?.id || existingInvoice?.lead_id || '');

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('INV-350');
  const [status, setStatus] = useState<InvoiceStatus>('Draft');
  const [issueDate, setIssueDate] = useState('06 August 2026');
  const [dueDate, setDueDate] = useState('20 August 2026');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('Thank you for your business!');
  const [signatoryName, setSignatoryName] = useState('Ajit Singh');

  const [agency, setAgency] = useState<ExtendedAgencyDetails>(GROWPIDO_DEFAULTS);
  const [clientInfo, setClientInfo] = useState<ClientDetails>({
    name: 'Test DragDrop Lead',
    company: 'Test DragDrop Lead',
    email: '',
    phone: '',
    address: '4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102',
    gst: '',
    poc: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: 'LinkedIn Personal Branding & Executive Content Engine',
      quantity: 1,
      unit_price: 1100,
      amount: 1100,
    },
  ]);

  // Load leads if needed
  useEffect(() => {
    if (!client && !existingInvoice) {
      leadsApi.list({ page_size: 100 }).then((res) => {
        setAllLeads(res.data.items || []);
      }).catch(console.error);
    }
  }, [client, existingInvoice]);

  const todayFormatted = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  const defaultDueFormatted = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  // Initialize Invoice Data
  useEffect(() => {
    if (existingInvoice) {
      setSelectedLeadId(existingInvoice.lead_id);
      setInvoiceNumber(existingInvoice.invoice_number);
      setStatus(existingInvoice.status);
      setIssueDate(existingInvoice.issue_date ? new Date(existingInvoice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : todayFormatted);
      setDueDate(existingInvoice.due_date ? new Date(existingInvoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : defaultDueFormatted);
      setCurrency(existingInvoice.currency || 'USD');
      setAgency({ ...GROWPIDO_DEFAULTS, ...(existingInvoice.agency_details || {}) });
      setSignatoryName((existingInvoice.agency_details as any)?.signatory_name || 'Ajit Singh');
      setClientInfo(existingInvoice.client_details || {
        name: existingInvoice.lead?.company_name || existingInvoice.lead?.full_name || 'Test DragDrop Lead',
        company: existingInvoice.lead?.company_name || existingInvoice.lead?.full_name || 'Test DragDrop Lead',
        email: existingInvoice.lead?.email || '',
        phone: existingInvoice.lead?.phone || '',
        address: (existingInvoice.lead as any)?.company_address || '4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102',
      });
      setItems(existingInvoice.items && existingInvoice.items.length > 0 ? existingInvoice.items : [
        { description: 'LinkedIn Personal Branding & Executive Content Engine', quantity: 1, unit_price: 1100, amount: 1100 }
      ]);
    } else if (client) {
      setSelectedLeadId(client.id);
      const randomSeq = Math.floor(100 + Math.random() * 900);
      setInvoiceNumber(`INV-${randomSeq}`);
      setStatus('Draft');
      setIssueDate(todayFormatted);
      setDueDate(defaultDueFormatted);
      setCurrency(client.budget && client.budget > 5000 ? 'INR' : 'USD');

      setClientInfo({
        name: client.company_name || client.full_name,
        company: client.company_name || client.full_name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.company_address || '4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102',
        poc: client.poc_name || client.full_name,
      });

      const budget = client.budget || 1100;
      setItems([
        {
          description: client.custom_ai_agent
            ? 'Custom AI Agent Architecture & Growth Automation Setup'
            : 'LinkedIn Personal Branding & Executive Content Engine',
          quantity: 1,
          unit_price: budget,
          amount: budget,
        },
      ]);
    }
  }, [client, existingInvoice, todayFormatted, defaultDueFormatted]);

  function handleLeadSelect(leadId: string) {
    setSelectedLeadId(leadId);
    const selected = allLeads.find((l) => l.id === leadId);
    if (selected) {
      setClientInfo({
        name: selected.company_name || selected.full_name,
        company: selected.company_name || selected.full_name,
        email: selected.email || '',
        phone: selected.phone || '',
        address: (selected as any).company_address || '4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102',
        poc: selected.poc_name || selected.full_name,
      });
      if (selected.budget) {
        setItems([
          {
            description: selected.custom_ai_agent
              ? 'Custom AI Agent Architecture & Growth Automation Setup'
              : 'LinkedIn Personal Branding & Executive Content Engine',
            quantity: 1,
            unit_price: selected.budget,
            amount: selected.budget,
          },
        ]);
        if (selected.budget > 5000) setCurrency('INR');
      }
    }
  }

  function handleItemChange(index: number, field: keyof InvoiceItem, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? Number(value) || 0 : newItems[index].quantity;
      const p = field === 'unit_price' ? Number(value) || 0 : newItems[index].unit_price;
      newItems[index].amount = q * p;
    }
    setItems(newItems);
  }

  function addItem(preset?: { title: string; desc: string; price: number }) {
    if (preset) {
      setItems([
        ...items,
        {
          description: preset.title,
          quantity: 1,
          unit_price: preset.price,
          amount: preset.price,
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          description: 'Strategic Consulting & Deliverables Retainer',
          quantity: 1,
          unit_price: 1000,
          amount: 1000,
        },
      ]);
    }
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  // Financial Calculations
  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0), [items]);
  const taxAmount = useMemo(() => (subtotal * (Number(taxRate) || 0)) / 100, [subtotal, taxRate]);
  const grandTotal = useMemo(() => Math.max(0, subtotal + taxAmount - (Number(discountAmount) || 0)), [subtotal, taxAmount, discountAmount]);

  const currencySymbol = useMemo(() => {
    const found = CURRENCIES.find((c) => c.code === currency);
    return found ? found.symbol : '$';
  }, [currency]);

  function formatCurrency(val: number) {
    return `${currencySymbol}${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Save to backend
  async function handleSave() {
    if (!selectedLeadId) {
      setError('Please select or assign a Client Lead.');
      return;
    }
    setSaving(true);
    setError('');

    const agencyPayload = {
      ...agency,
      signatory_name: signatoryName,
    };

    const payload = {
      lead_id: selectedLeadId,
      invoice_number: invoiceNumber,
      status,
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
      currency,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: grandTotal,
      notes,
      agency_details: agencyPayload,
      client_details: clientInfo,
      items,
    };

    try {
      let savedInvoice: Invoice;
      if (existingInvoice) {
        const res = await invoicesApi.update(existingInvoice.id, payload);
        savedInvoice = res.data;
      } else {
        const res = await invoicesApi.create(payload);
        savedInvoice = res.data;
      }
      onSaved(savedInvoice);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  // Generate Exact Second Image Template HTML with slightly lighter blue palette
  const getCleanPrintableHtml = useCallback(() => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber} — Growpido</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Caveat:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 portrait; margin: 0; }
    html, body {
      background: #FFFFFF;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0F172A;
      width: 100%;
      height: 100%;
    }
    .page-sheet {
      width: 210mm;
      min-height: 297mm;
      background: #FFFFFF;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(0,0,0,0.05);
    }
    
    /* Top & Side Subtle Background Wave */
    .bg-wave-watermark {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 380px;
      pointer-events: none;
      opacity: 0.45;
      z-index: 0;
    }

    .main-container {
      padding: 44px 44px 20px 44px;
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* 1. Header Section */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 38px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .shield-logo-wrap {
      width: 52px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-texts {
      display: flex;
      flex-direction: column;
    }

    .brand-title-main {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: #0E3B8C;
      line-height: 1.1;
    }

    .brand-tagline-main {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: #0E3B8C;
      text-transform: uppercase;
      margin-top: 6px;
      padding-bottom: 4px;
      border-bottom: 2px solid #0E3B8C;
      display: inline-block;
      width: fit-content;
    }

    .invoice-title-wrap {
      text-align: right;
    }

    .invoice-title-text {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #0E3B8C;
      line-height: 1;
    }

    .invoice-underline-bar {
      width: 76px;
      height: 3px;
      background: #185ADB;
      margin-top: 8px;
      margin-left: auto;
      border-radius: 2px;
    }

    /* 2. Metadata Grid (2 Columns + Divider) */
    .meta-info-container {
      display: grid;
      grid-template-columns: 1fr 1px 1.45fr;
      gap: 28px;
      margin-bottom: 34px;
      align-items: center;
    }

    .meta-divider-line {
      background: #E2E8F0;
      height: 100%;
      min-height: 80px;
    }

    .meta-item-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .meta-item-row:last-child {
      margin-bottom: 0;
    }

    .icon-badge-blue {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0E3B8C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(14, 59, 140, 0.25);
    }

    .meta-text-col {
      display: flex;
      flex-direction: column;
    }

    .meta-label-sub {
      font-size: 12px;
      color: #64748B;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .meta-value-bold {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
    }

    .client-issued-box {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .client-address-text {
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin-top: 4px;
    }

    /* 3. Deliverables Table */
    .table-container {
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 34px;
    }

    .services-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .services-table thead tr {
      background: linear-gradient(90deg, #0A2E7A 0%, #1046A9 50%, #175BD8 100%) !important;
    }

    .services-table thead th {
      color: #FFFFFF !important;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 13px 12px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }
    .services-table thead th:last-child {
      border-right: none;
    }

    .services-table tbody tr {
      border-bottom: 1px solid #E2E8F0;
      min-height: 70px;
    }

    .services-table tbody td {
      padding: 18px 14px;
      color: #0F172A;
      vertical-align: middle;
      border-right: 1px solid #E2E8F0;
    }
    .services-table tbody td:last-child {
      border-right: none;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }

    /* Total Due Row */
    .total-due-row {
      display: grid;
      grid-template-columns: 1fr 280px;
      background: #F0F6FF;
      border-top: 1px solid #CBD5E1;
    }

    .total-due-left-label {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 18px 24px;
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0A2E7A;
    }

    .total-due-right-val {
      background: #0A2E7A;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.01em;
      padding: 16px 20px;
    }

    /* 4. Payment Information & Signatory Section */
    .bottom-info-matrix {
      display: grid;
      grid-template-columns: 1.15fr 1px 1fr;
      gap: 28px;
      margin-top: auto;
      margin-bottom: 24px;
      align-items: center;
    }

    .payment-sec-title {
      font-size: 12.5px;
      font-weight: 900;
      color: #0E3B8C;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .payment-row {
      display: flex;
      align-items: center;
      font-size: 12px;
      margin-bottom: 7px;
    }
    .payment-row:last-child {
      margin-bottom: 0;
    }

    .payment-row-icon {
      font-size: 13px;
      margin-right: 8px;
      color: #0E3B8C;
      width: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .payment-row-key {
      color: #0F172A;
      font-weight: 600;
      width: 104px;
    }

    .payment-row-colon {
      margin: 0 10px 0 2px;
      color: #64748B;
      font-weight: 700;
    }

    .payment-row-val {
      font-weight: 800;
      color: #0F172A;
    }

    /* Signatory Box */
    .signatory-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
    }

    .signature-cursive {
      font-family: 'Caveat', cursive;
      font-size: 42px;
      font-weight: 700;
      color: #0E3B8C;
      line-height: 1;
      margin-bottom: 6px;
    }

    .signature-line-wrap {
      width: 220px;
      position: relative;
      margin-bottom: 10px;
    }

    .signature-line {
      width: 100%;
      height: 1.5px;
      background: #0E3B8C;
    }

    .signature-dot {
      width: 6px;
      height: 6px;
      background: #0E3B8C;
      border-radius: 50%;
      position: absolute;
      right: 0;
      top: -2.2px;
    }

    .signatory-name-text {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
    }

    .signatory-role-text {
      font-size: 11.5px;
      color: #64748B;
      font-weight: 500;
      margin-top: 2px;
    }

    /* 5. Bottom Sovereign Blue Footer Bar */
    .footer-bar-container {
      background: linear-gradient(135deg, #0A2E7A 0%, #1046A9 50%, #175BD8 100%) !important;
      padding: 18px 44px;
      color: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .footer-brand-name {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: #FFFFFF;
    }

    .footer-contact-info {
      font-size: 11.5px;
      line-height: 1.7;
      display: flex;
      flex-direction: column;
      color: #FFFFFF;
      font-weight: 500;
    }

    .footer-contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-qr-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .footer-qr-text {
      text-align: right;
    }

    .scan-to-pay-label {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #FFFFFF;
    }

    .thank-you-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 2px;
    }

    .qr-frame {
      width: 60px;
      height: 60px;
      background: #FFFFFF;
      border-radius: 4px;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <!-- Background Wave Top Graphic -->
    <svg class="bg-wave-watermark" viewBox="0 0 1200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,0 C300,120 700,20 1200,80 L1200,0 L0,0 Z" fill="#F0F6FF"/>
      <path d="M0,80 C350,180 800,90 1200,140" stroke="#E2EDFC" stroke-width="1.5" fill="none"/>
      <path d="M0,130 C400,220 850,130 1200,180" stroke="#EDF4FD" stroke-width="1.5" fill="none"/>
    </svg>

    <div class="main-container">
      <!-- 1. Header -->
      <div class="header-section">
        <div class="brand-group">
          <div class="shield-logo-wrap">
            <svg width="44" height="52" viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M200 24 C280 24, 355 46, 355 46 C355 46, 355 190, 355 240 C355 330, 200 436, 200 436 C200 436, 45 330, 45 240 C45 190, 45 46, 45 46 C45 46, 120 24, 200 24 Z" fill="none" stroke="#0E3B8C" stroke-width="32" stroke-linejoin="round" />
              <path d="M112 322 L222 178 L168 186 L248 94 L288 238 L246 198 L138 340 Z" fill="#0E3B8C" />
            </svg>
          </div>
          <div class="brand-texts">
            <div class="brand-title-main">GROWPIDO</div>
            <div class="brand-tagline-main">BUILD. POSITION. GROW.</div>
          </div>
        </div>

        <div class="invoice-title-wrap">
          <div class="invoice-title-text">INVOICE</div>
          <div class="invoice-underline-bar"></div>
        </div>
      </div>

      <!-- 2. Meta Grid (2 Columns + Divider) -->
      <div class="meta-info-container">
        <!-- Left Sub-Column: Invoice No & Date -->
        <div>
          <div class="meta-item-row">
            <div class="icon-badge-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div class="meta-text-col">
              <span class="meta-label-sub">Invoice No:</span>
              <span class="meta-value-bold">${invoiceNumber}</span>
            </div>
          </div>

          <div class="meta-item-row">
            <div class="icon-badge-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div class="meta-text-col">
              <span class="meta-label-sub">Date Issued:</span>
              <span class="meta-value-bold">${issueDate}</span>
            </div>
          </div>
        </div>

        <!-- Vertical Divider -->
        <div class="meta-divider-line"></div>

        <!-- Right Sub-Column: Issued to Client -->
        <div class="client-issued-box">
          <div class="icon-badge-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="meta-text-col">
            <span class="meta-label-sub">Issued to:</span>
            <span class="meta-value-bold" style="font-size: 16px;">${clientInfo.company || clientInfo.name}</span>
            <p class="client-address-text">${clientInfo.address || '4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102'}</p>
          </div>
        </div>
      </div>

      <!-- 3. Table of Deliverables -->
      <div class="table-container">
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 60px;" class="text-center">NO.</th>
              <th class="text-left">DESCRIPTION</th>
              <th style="width: 70px;" class="text-center">QTY</th>
              <th style="width: 130px;" class="text-center">PRICE</th>
              <th style="width: 140px;" class="text-center">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td class="text-center" style="font-weight: 700; color: #0F172A;">${idx + 1}</td>
                <td class="text-left" style="font-weight: 700; color: #0F172A; line-height: 1.4;">${it.description}</td>
                <td class="text-center" style="font-weight: 600;">${it.quantity}</td>
                <td class="text-center" style="font-weight: 600;">${formatCurrency(it.unit_price)}</td>
                <td class="text-center" style="font-weight: 800; color: #0F172A;">${formatCurrency(it.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- TOTAL DUE ROW -->
        <div class="total-due-row">
          <div class="total-due-left-label">
            TOTAL DUE
          </div>
          <div class="total-due-right-val">
            ${formatCurrency(grandTotal)}
          </div>
        </div>
      </div>

      <!-- 4. Payment Information & Signatory Matrix -->
      <div class="bottom-info-matrix">
        <!-- Left: Bank Details -->
        <div>
          <div class="payment-sec-title">PAYMENT INFORMATION</div>
          <div class="payment-row">
            <span class="payment-row-icon">🏛️</span>
            <span class="payment-row-key">Bank Name</span>
            <span class="payment-row-colon">:</span>
            <span class="payment-row-val">${agency.bank_name || 'Axis Bank'}</span>
          </div>
          <div class="payment-row">
            <span class="payment-row-icon">👤</span>
            <span class="payment-row-key">Account Name</span>
            <span class="payment-row-colon">:</span>
            <span class="payment-row-val">${agency.account_name || 'Ajit Singh'}</span>
          </div>
          <div class="payment-row">
            <span class="payment-row-icon">💳</span>
            <span class="payment-row-key">Account No</span>
            <span class="payment-row-colon">:</span>
            <span class="payment-row-val">${agency.account_number || '910010040802885'}</span>
          </div>
          <div class="payment-row">
            <span class="payment-row-icon">🏛️</span>
            <span class="payment-row-key">IFSC Code</span>
            <span class="payment-row-colon">:</span>
            <span class="payment-row-val">${agency.ifsc || 'UTIB0000039'}</span>
          </div>
          <div class="payment-row">
            <span class="payment-row-icon">🌐</span>
            <span class="payment-row-key">SWIFT Code</span>
            <span class="payment-row-colon">:</span>
            <span class="payment-row-val">${agency.swift_code || 'AXISINBB0039'}</span>
          </div>
          <div class="payment-row">
            <span class="payment-row-icon">📱</span>
            <span class="payment-row-key">UPI ID</span>
            <span class="payment-row-colon">:</span>
            <span class="payment-row-val">${agency.upi_id || 'founder@growpido'}</span>
          </div>
        </div>

        <!-- Vertical Divider -->
        <div class="meta-divider-line"></div>

        <!-- Right: Signatory -->
        <div class="signatory-box">
          <div class="signature-cursive">${signatoryName || 'Ajit Singh'}</div>
          <div class="signature-line-wrap">
            <div class="signature-line"></div>
            <div class="signature-dot"></div>
          </div>
          <div class="signatory-name-text">${signatoryName || 'Ajit Singh'}</div>
          <div class="signatory-role-text">(Authorized Signatory)</div>
        </div>
      </div>
    </div>

    <!-- 5. Bottom Sovereign Blue Footer Bar -->
    <div class="footer-bar-container">
      <div class="footer-brand">
        <svg width="26" height="30" viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M200 24 C280 24, 355 46, 355 46 C355 46, 355 190, 355 240 C355 330, 200 436, 200 436 C200 436, 45 330, 45 240 C45 190, 45 46, 45 46 C45 46, 120 24, 200 24 Z" fill="none" stroke="#FFFFFF" stroke-width="32" stroke-linejoin="round" />
          <path d="M112 322 L222 178 L168 186 L248 94 L288 238 L246 198 L138 340 Z" fill="#FFFFFF" />
        </svg>
        <span class="footer-brand-name">GROWPIDO</span>
      </div>

      <div class="footer-contact-info">
        <div class="footer-contact-row">
          <span>📞</span>
          <span>${agency.phone || '+91 99999 09330'}</span>
        </div>
        <div class="footer-contact-row">
          <span>✉️</span>
          <span>${agency.email || 'founder@growpido.com'}</span>
        </div>
        <div class="footer-contact-row">
          <span>🌐</span>
          <span>www.growpido.com</span>
        </div>
      </div>

      <div class="footer-qr-group">
        <div class="footer-qr-text">
          <div class="scan-to-pay-label">SCAN TO PAY</div>
          <div class="thank-you-label">Thank you for your<br>business!</div>
        </div>
        <div class="qr-frame">
          <svg width="52" height="52" viewBox="0 0 100 100" fill="#0A2E7A">
            <!-- QR Code Pattern -->
            <rect x="0" y="0" width="30" height="30" fill="#0A2E7A"/>
            <rect x="5" y="5" width="20" height="20" fill="#FFFFFF"/>
            <rect x="10" y="10" width="10" height="10" fill="#0A2E7A"/>

            <rect x="70" y="0" width="30" height="30" fill="#0A2E7A"/>
            <rect x="75" y="5" width="20" height="20" fill="#FFFFFF"/>
            <rect x="80" y="10" width="10" height="10" fill="#0A2E7A"/>

            <rect x="0" y="70" width="30" height="30" fill="#0A2E7A"/>
            <rect x="5" y="75" width="20" height="20" fill="#FFFFFF"/>
            <rect x="10" y="80" width="10" height="10" fill="#0A2E7A"/>

            <!-- Data Bits -->
            <rect x="36" y="8" width="6" height="6" fill="#0A2E7A"/>
            <rect x="48" y="14" width="8" height="6" fill="#0A2E7A"/>
            <rect x="36" y="24" width="12" height="6" fill="#0A2E7A"/>
            <rect x="56" y="6" width="6" height="12" fill="#0A2E7A"/>

            <rect x="8" y="38" width="6" height="8" fill="#0A2E7A"/>
            <rect x="20" y="44" width="8" height="6" fill="#0A2E7A"/>
            <rect x="12" y="56" width="14" height="6" fill="#0A2E7A"/>

            <rect x="38" y="38" width="24" height="24" fill="#0A2E7A"/>
            <rect x="44" y="44" width="12" height="12" fill="#FFFFFF"/>
            <rect x="48" y="48" width="4" height="4" fill="#0A2E7A"/>

            <rect x="70" y="38" width="8" height="8" fill="#0A2E7A"/>
            <rect x="84" y="44" width="10" height="6" fill="#0A2E7A"/>
            <rect x="74" y="56" width="18" height="8" fill="#0A2E7A"/>

            <rect x="38" y="72" width="8" height="8" fill="#0A2E7A"/>
            <rect x="52" y="78" width="12" height="6" fill="#0A2E7A"/>
            <rect x="44" y="88" width="16" height="6" fill="#0A2E7A"/>

            <rect x="72" y="72" width="10" height="10" fill="#0A2E7A"/>
            <rect x="86" y="82" width="8" height="12" fill="#0A2E7A"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }, [invoiceNumber, issueDate, clientInfo, items, agency, signatoryName, grandTotal, currencySymbol]);

  // Robust Native Print Function
  function handlePrintPdf() {
    const htmlContent = getCleanPrintableHtml();
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 500);
    }
  }

  function handleDownloadHtml() {
    const htmlContent = getCleanPrintableHtml();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Growpido-Invoice-${invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: viewMode === 'split' ? '1420px' : '980px',
          width: '98%',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transition: 'max-width 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar */}
        <div
          style={{
            background: '#0B1E48',
            color: '#FFFFFF',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00D2FF 0%, #0E3B8C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 210, 255, 0.3)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M200 24 C280 24, 355 46, 355 46 C355 46, 355 190, 355 240 C355 330, 200 436, 200 436 C200 436, 45 330, 45 240 C45 190, 45 46, 45 46 C45 46, 120 24, 200 24 Z" fill="none" stroke="#FFFFFF" strokeWidth="28" />
                <path d="M112 322 L222 178 L168 186 L248 94 L288 238 L246 198 L138 340 Z" fill="#FFFFFF" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                  Growpido Invoice Studio
                </h2>
                <span style={{ background: 'rgba(0, 210, 255, 0.15)', color: '#00D2FF', border: '1px solid rgba(0, 210, 255, 0.3)', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  Company Edition
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                {clientInfo.company || clientInfo.name || 'Executive Client Billing'}
              </span>
            </div>
          </div>

          {/* Controls: View Mode, Currency, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex' }}>
              <button
                type="button"
                className={`btn btn-xs ${viewMode === 'split' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', color: viewMode === 'split' ? '#fff' : '#cbd5e1' }}
                onClick={() => setViewMode('split')}
              >
                ◫ Split
              </button>
              <button
                type="button"
                className={`btn btn-xs ${viewMode === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', color: viewMode === 'preview' ? '#fff' : '#cbd5e1' }}
                onClick={() => setViewMode('preview')}
              >
                📄 Preview
              </button>
              <button
                type="button"
                className={`btn btn-xs ${viewMode === 'editor' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', color: viewMode === 'editor' ? '#fff' : '#cbd5e1' }}
                onClick={() => setViewMode('editor')}
              >
                ⚙️ Form
              </button>
            </div>

            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                style={{ background: '#1E293B', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', height: '28px', fontSize: '11px', padding: '2px 6px', borderRadius: '6px' }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{ fontSize: '16px', lineHeight: 1, padding: '4px 8px', color: '#94A3B8' }}
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#F1F5F9' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Main Studio Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* ================= LEFT PANE: FORM EDITOR ================= */}
            {(viewMode === 'split' || viewMode === 'editor') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 1. Client & Invoice Core */}
                <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0E3B8C', margin: 0, letterSpacing: '0.05em' }}>
                      1. Client &amp; Invoice Particulars
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {!client && allLeads.length > 0 && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                          Select Lead / Client from CRM
                        </label>
                        <select
                          className="form-control"
                          style={{ fontSize: '12.5px', height: '36px' }}
                          value={selectedLeadId}
                          onChange={(e) => handleLeadSelect(e.target.value)}
                        >
                          <option value="">-- Choose Existing Lead/Client or Type Below --</option>
                          {allLeads.map((ld) => (
                            <option key={ld.id} value={ld.id}>
                              {ld.company_name ? `${ld.company_name} (${ld.full_name})` : ld.full_name} — Stage: {ld.stage}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Client / Company Name *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientInfo.company || clientInfo.name}
                        onChange={(e) => setClientInfo({ ...clientInfo, company: e.target.value, name: e.target.value })}
                        placeholder="e.g. Test DragDrop Lead"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Invoice Number
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="e.g. INV-350"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Date Issued
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        placeholder="06 August 2026"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Payment Due Date
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="20 August 2026"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Status
                      </label>
                      <select
                        className="form-control"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                      >
                        <option value="Draft">Draft (In Preparation)</option>
                        <option value="Sent">Sent (Awaiting Payment)</option>
                        <option value="Paid">Paid (Completed &amp; Settled)</option>
                        <option value="Overdue">Overdue (Follow Up Required)</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Payment Terms
                      </label>
                      <select
                        className="form-control"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 15 Days">Net 15 Days</option>
                        <option value="Net 30 Days">Net 30 Days</option>
                        <option value="50% Advance / 50% Milestone">50% Advance / 50% Milestone</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Client Address &amp; Contact Line
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={clientInfo.address || ''}
                        onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                        placeholder="4TH FLOOR, VENTURE X, LANDMARK CYBERPARK, GURUGRAM, HARYANA, INDIA - 122102"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Deliverable Scope & Line Items */}
                <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0E3B8C', margin: 0, letterSpacing: '0.05em' }}>
                      2. Deliverables &amp; Scope of Work
                    </h4>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => addItem()}
                      style={{ fontSize: '11px', color: '#0E3B8C', fontWeight: 700 }}
                    >
                      + Add Item
                    </button>
                  </div>

                  {/* Preset Quick Inserter */}
                  <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, alignSelf: 'center' }}>Presets:</span>
                    {PRESET_DELIVERABLES.map((ps, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addItem(ps)}
                        style={{
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#1D4ED8',
                          fontSize: '10.5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        + {ps.title.slice(0, 24)}... ({formatCurrency(ps.price)})
                      </button>
                    ))}
                  </div>

                  {/* Line Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 60px 100px 90px 32px',
                          gap: '8px',
                          alignItems: 'center',
                          background: '#F8FAFC',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '12px' }}
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Deliverable description..."
                        />
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ fontSize: '12px', textAlign: 'center' }}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          step="10"
                          className="form-control"
                          style={{ fontSize: '12px', textAlign: 'right' }}
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        />
                        <div style={{ fontSize: '12.5px', fontWeight: 800, textAlign: 'right', color: '#0F172A' }}>
                          {formatCurrency(item.amount)}
                        </div>
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => removeItem(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: items.length <= 1 ? '#CBD5E1' : '#EF4444',
                            cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                          }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Bank Settlement & Signatory Info */}
                <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0E3B8C', margin: '0 0 12px', letterSpacing: '0.05em' }}>
                    3. Payment Information &amp; Signatory
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Bank Name</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '12px', height: '32px' }}
                        value={agency.bank_name || ''}
                        onChange={(e) => setAgency({ ...agency, bank_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Account Name</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '12px', height: '32px' }}
                        value={agency.account_name || ''}
                        onChange={(e) => setAgency({ ...agency, account_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Account Number</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '12px', height: '32px' }}
                        value={agency.account_number || ''}
                        onChange={(e) => setAgency({ ...agency, account_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>IFSC Code</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '12px', height: '32px' }}
                        value={agency.ifsc || ''}
                        onChange={(e) => setAgency({ ...agency, ifsc: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>SWIFT Code</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '12px', height: '32px' }}
                        value={agency.swift_code || ''}
                        onChange={(e) => setAgency({ ...agency, swift_code: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Signatory Name</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '12px', height: '32px' }}
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= RIGHT PANE: LIVE PREVIEW ================= */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  position: 'sticky',
                  top: 0,
                }}
              >
                {/* Embedded HTML Live Preview Container */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '680px',
                    minHeight: '880px',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.06)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                  }}
                >
                  <iframe
                    srcDoc={getCleanPrintableHtml()}
                    style={{
                      width: '100%',
                      height: '880px',
                      border: 'none',
                      display: 'block',
                      background: '#FFFFFF',
                    }}
                    title="Live Invoice Preview"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div
          style={{
            background: '#0B1E48',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={handlePrintPdf}
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#CBD5E1',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={handleDownloadHtml}
            >
              <span>💾</span>
              <span>Download Standalone HTML</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#CBD5E1' }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(135deg, #00D2FF 0%, #0E3B8C 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(0, 210, 255, 0.4)',
                border: 'none',
              }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : existingInvoice ? 'Update Invoice' : 'Save Invoice to CRM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
