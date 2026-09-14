import React, { useState, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  Upload,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  User,
  Phone,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  MapPin,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  extractIdInformationFromImage,
  extractCheckInformationFromImage,
  ExtractedIdData,
  ExtractedCheckData,
} from '../../utils/idOcrService';

interface CheckUploadDirectViewProps {
  sessionId?: string;
  token?: string;
}

export const CheckUploadDirectView: React.FC<CheckUploadDirectViewProps> = ({
  sessionId = `chk-session-${Date.now()}`,
  token = `INTAKE-${Math.floor(1000 + Math.random() * 9000)}`,
}) => {
  // Form Data (Auto-filled by OCR)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdType, setCustomerIdType] = useState('Driver License');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [customerIdState, setCustomerIdState] = useState('TX');
  const [customerDob, setCustomerDob] = useState('');
  const [customerExpiration, setCustomerExpiration] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [checkAmount, setCheckAmount] = useState('');
  const [checkType, setCheckType] = useState('payroll');
  const [checkNumber, setCheckNumber] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [micrRoutingNumber, setMicrRoutingNumber] = useState('');
  const [micrAccountNumber, setMicrAccountNumber] = useState('');

  // Photos
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);

  // OCR Extraction States
  const [isProcessingIdOcr, setIsProcessingIdOcr] = useState(false);
  const [idOcrResult, setIdOcrResult] = useState<ExtractedIdData | null>(null);
  const [isProcessingCheckOcr, setIsProcessingCheckOcr] = useState(false);
  const [checkOcrResult, setCheckOcrResult] = useState<ExtractedCheckData | null>(null);

  // Active target for upload
  const [captureTarget, setCaptureTarget] = useState<'front' | 'back' | 'id'>('front');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = (target: 'front' | 'back' | 'id') => {
    setCaptureTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      playBeep('click');

      if (captureTarget === 'id') {
        setIdImage(dataUrl);
        setIsProcessingIdOcr(true);
        setErrorMessage(null);
        try {
          const ocr = await extractIdInformationFromImage(dataUrl, customerName);
          setIdOcrResult(ocr);
          setCustomerName(ocr.fullName);
          setCustomerIdType(ocr.idType);
          setCustomerIdNumber(ocr.idNumber);
          setCustomerIdState(ocr.idState);
          setCustomerDob(ocr.dateOfBirth);
          setCustomerExpiration(ocr.expirationDate);
          if (ocr.address) {
            setCustomerAddress(`${ocr.address.street}, ${ocr.address.city}, ${ocr.address.state} ${ocr.address.zip}`);
          }
          playBeep('success');
        } catch (err) {
          console.error('ID OCR failed', err);
        } finally {
          setIsProcessingIdOcr(false);
        }
      } else if (captureTarget === 'front') {
        setFrontImage(dataUrl);
        setIsProcessingCheckOcr(true);
        setErrorMessage(null);
        try {
          const checkOcr = await extractCheckInformationFromImage(dataUrl);
          setCheckOcrResult(checkOcr);
          setCheckAmount(checkOcr.checkAmount.toFixed(2));
          setCheckNumber(checkOcr.checkNumber);
          setIssuerName(checkOcr.issuerName);
          setMicrRoutingNumber(checkOcr.routingNumber);
          setMicrAccountNumber(checkOcr.accountNumber);
          if (checkOcr.payeeName && !customerName) {
            setCustomerName(checkOcr.payeeName);
          }
          playBeep('success');
        } catch (err) {
          console.error('Check OCR failed', err);
        } finally {
          setIsProcessingCheckOcr(false);
        }
      } else if (captureTarget === 'back') {
        setBackImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontImage) {
      setErrorMessage('Please capture or upload the front of your check.');
      return;
    }
    if (!idImage) {
      setErrorMessage("Please capture or upload a clear photo of your Driver's License or Government ID.");
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await api.submitCheckQrImages(token, {
        sessionId,
        token,
        name: customerName.trim(),
        customerName: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        idType: customerIdType,
        customerIdType,
        idNumber: customerIdNumber.trim() || undefined,
        customerIdNumber: customerIdNumber.trim() || undefined,
        idState: customerIdState,
        customerIdState,
        checkAmount: parseFloat(checkAmount) || 0,
        checkType,
        checkNumber: checkNumber.trim() || undefined,
        issuerName: issuerName.trim() || undefined,
        micrRoutingNumber: micrRoutingNumber.trim() || undefined,
        micrAccountNumber: micrAccountNumber.trim() || undefined,
        checkFrontUrl: frontImage,
        checkBackUrl: backImage || undefined,
        customerIdFrontUrl: idImage,
      });

      playBeep('success');
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to transmit check and ID documents. Please try again.');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setFrontImage(null);
    setBackImage(null);
    setIdImage(null);
    setIdOcrResult(null);
    setCheckOcrResult(null);
    setCheckAmount('');
    setCheckNumber('');
    setIssuerName('');
    setIsSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-sans select-none">
      {/* Hidden native file input without forcing live webcam prompt */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header - Customer Intake Form Only (No POS access) */}
      <header className="bg-[#101524] border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 border border-[#C5A059]/50 flex items-center justify-center text-[#C5A059] font-black text-sm shadow-xs">
              377
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight uppercase">
                377 Spirits Check Intake
              </h1>
              <span className="text-[10px] text-slate-400 font-mono">
                Terminal Document Drop • #{token}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted Intake</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-start space-y-4">
        {isSuccess ? (
          /* Success Screen: Explicitly states documents sent to POS with no option to enter POS */
          <div className="bg-[#121829] border border-emerald-500/40 rounded-2xl p-6 text-center space-y-5 shadow-2xl my-auto animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/50 shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase text-white tracking-wider">
                Check & ID Transmitted!
              </h2>
              <p className="text-xs text-slate-300">
                Your check and government ID images have been received by Cashier Terminal #01.
              </p>
            </div>

            <div className="bg-[#1A2238] rounded-xl p-3.5 text-xs text-left space-y-2 border border-slate-700/60 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Intake Reference:</span>
                <span className="text-amber-400 font-bold">{token}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payee / Name:</span>
                <span className="text-white font-bold">{customerName}</span>
              </div>
              {checkAmount && (
                <div className="flex justify-between text-slate-400">
                  <span>Check Amount:</span>
                  <span className="text-emerald-400 font-bold">${parseFloat(checkAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Attached Files:</span>
                <span className="text-emerald-300 font-bold">Check Front, Check Back, Driver License</span>
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-[11px] text-amber-200 text-left leading-relaxed">
              Please present your physical photo ID to the cashier at the counter. The cashier will review the check images and dispense your cash payout from the register drawer.
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="w-full py-3 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer"
              >
                Upload Another Check / ID
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Top Prompt */}
            <div className="bg-[#121829] border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Fast Check & ID Mobile Intake</span>
                <span className="text-[11px] text-slate-400">
                  Upload your check photos and Driver&apos;s License. Our OCR will automatically read the fields for you!
                </span>
              </div>
            </div>

            {/* 3 Document Capture Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Driver License / ID Photo (Required) */}
              <div
                onClick={() => triggerUpload('id')}
                className={`relative rounded-xl border-2 p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[135px] overflow-hidden ${
                  idImage
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : 'border-amber-500/50 bg-[#141A2D] hover:border-amber-400'
                }`}
              >
                {idImage ? (
                  <>
                    <img src={idImage} alt="Customer ID" className="w-full h-20 object-cover rounded-lg mb-1" />
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ID Attached</span>
                    </span>
                    <span className="text-[9px] text-slate-400 underline mt-0.5">Tap to replace</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white uppercase">1. Driver License</span>
                    <span className="text-[10px] text-amber-300/80 mt-0.5">Front of ID (Required)</span>
                  </>
                )}
              </div>

              {/* 2. Check Front (Required) */}
              <div
                onClick={() => triggerUpload('front')}
                className={`relative rounded-xl border-2 p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[135px] overflow-hidden ${
                  frontImage
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : 'border-slate-700 bg-[#141A2D] hover:border-slate-500'
                }`}
              >
                {frontImage ? (
                  <>
                    <img src={frontImage} alt="Check Front" className="w-full h-20 object-cover rounded-lg mb-1" />
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Check Front OK</span>
                    </span>
                    <span className="text-[9px] text-slate-400 underline mt-0.5">Tap to replace</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mb-1.5">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white uppercase">2. Check Front</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Full check face</span>
                  </>
                )}
              </div>

              {/* 3. Check Back (Endorsement) */}
              <div
                onClick={() => triggerUpload('back')}
                className={`relative rounded-xl border-2 p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[135px] overflow-hidden ${
                  backImage
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : 'border-slate-700 bg-[#141A2D] hover:border-slate-500'
                }`}
              >
                {backImage ? (
                  <>
                    <img src={backImage} alt="Check Back" className="w-full h-20 object-cover rounded-lg mb-1" />
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Check Back OK</span>
                    </span>
                    <span className="text-[9px] text-slate-400 underline mt-0.5">Tap to replace</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mb-1.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white uppercase">3. Check Back</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Signature endorsement</span>
                  </>
                )}
              </div>
            </div>

            {/* OCR Processing Indicators */}
            {isProcessingIdOcr && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center space-x-2 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Reading Driver License text via OCR... Auto-filling name, DOB & ID number</span>
              </div>
            )}

            {isProcessingCheckOcr && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Extracting MICR routing, account, and check amount via OCR...</span>
              </div>
            )}

            {/* OCR Success Badges */}
            {idOcrResult && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Driver License OCR Confirmed: <strong>{idOcrResult.fullName}</strong> ({idOcrResult.calculatedAge} yrs, DOB: {idOcrResult.dateOfBirth})
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                  {idOcrResult.confidence.toFixed(1)}% Match
                </span>
              </div>
            )}

            {checkOcrResult && (
              <div className="p-2.5 bg-sky-950/40 border border-sky-500/40 rounded-xl text-xs text-sky-300 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Check Amount Extracted: <strong>${checkOcrResult.checkAmount.toFixed(2)}</strong> (Check #{checkOcrResult.checkNumber})
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-sky-500/20 px-2 py-0.5 rounded-md font-mono">
                  {checkOcrResult.confidence.toFixed(1)}% Match
                </span>
              </div>
            )}

            {/* Auto-filled Form Fields (Editable by user) */}
            <div className="bg-[#121829] border border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Customer & Check Information</span>
                </span>
                <span className="text-[10px] text-slate-400">Auto-filled from images</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Full Legal Name (as on Driver License)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. SARAH ELIZABETH JENKINS"
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059] font-medium"
                  />
                </div>
              </div>

              {/* Phone & Check Amount */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(817) 555-0199"
                      className="w-full bg-[#0E121E] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Check Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={checkAmount}
                      onChange={e => setCheckAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0E121E] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059] font-mono font-bold text-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* ID Details Row */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ID Type</label>
                  <select
                    value={customerIdType}
                    onChange={e => setCustomerIdType(e.target.value)}
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="Driver License">Driver License</option>
                    <option value="State ID">State ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Military ID">Military ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={customerIdNumber}
                    onChange={e => setCustomerIdNumber(e.target.value)}
                    placeholder="TX-49281033"
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">State / DOB</label>
                  <input
                    type="text"
                    value={customerDob ? `${customerIdState} • ${customerDob}` : customerIdState}
                    onChange={e => setCustomerIdState(e.target.value)}
                    placeholder="TX"
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Check Issuer & Type */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Check Classification</label>
                  <select
                    value={checkType}
                    onChange={e => setCheckType(e.target.value)}
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="payroll">Payroll Check</option>
                    <option value="government">Government / Treasury Check</option>
                    <option value="cashiers">Bank Cashier&apos;s Check</option>
                    <option value="tax_refund">Tax Refund Check</option>
                    <option value="personal">Personal Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Check Number</label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={e => setCheckNumber(e.target.value)}
                    placeholder="e.g. 1084"
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Issuer Name */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Check Issuer / Company</label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={issuerName}
                    onChange={e => setIssuerName(e.target.value)}
                    placeholder="e.g. Granbury Remodeling LLC"
                    className="w-full bg-[#0E121E] border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Customer Address from OCR */}
              {customerAddress && (
                <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Address on ID: {customerAddress}</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Transmit Button (Does NOT open POS, transmits directly to register) */}
            <button
              type="submit"
              disabled={isSubmitting || !frontImage || !idImage}
              className="w-full py-4 bg-[#C5A059] hover:bg-[#B38F46] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-98"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? 'Transmitting to Cashier Terminal...' : 'Send Check & ID to Cashier'}</span>
            </button>
          </form>
        )}
      </main>

      {/* Footer without POS navigation */}
      <footer className="p-3 text-center border-t border-slate-800 text-[11px] text-slate-500 shrink-0">
        377 Spirits Granbury • Secure Customer Check & ID Intake Terminal
      </footer>
    </div>
  );
};
