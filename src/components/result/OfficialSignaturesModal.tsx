import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Check, 
  X, 
  FileCheck2, 
  Info, 
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { 
  getStoredSignatures, 
  saveStoredSignatures, 
  SchoolSignatures 
} from '../../utils/signatureStorage';

interface OfficialSignaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignaturesUpdated?: (sigs: SchoolSignatures) => void;
}

export const OfficialSignaturesModal: React.FC<OfficialSignaturesModalProps> = ({
  isOpen,
  onClose,
  onSignaturesUpdated
}) => {
  const [signatures, setSignatures] = useState<SchoolSignatures>(getStoredSignatures);
  const [principalPreview, setPrincipalPreview] = useState<string>('');
  const [controllerPreview, setControllerPreview] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');

  const principalFileInputRef = useRef<HTMLInputElement>(null);
  const controllerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getStoredSignatures();
      setSignatures(current);
      setPrincipalPreview(current.principalSignUrl || '');
      setControllerPreview(current.controllerSignUrl || '');
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'principal' | 'controller'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया केवल इमेज (JPG, PNG, WebP) फाइल अपलोड करें।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (type === 'principal') {
        setPrincipalPreview(result);
      } else {
        setControllerPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (type: 'principal' | 'controller') => {
    if (type === 'principal') {
      setPrincipalPreview('');
      if (principalFileInputRef.current) principalFileInputRef.current.value = '';
    } else {
      setControllerPreview('');
      if (controllerFileInputRef.current) controllerFileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    const updated = saveStoredSignatures({
      principalSignUrl: principalPreview,
      controllerSignUrl: controllerPreview
    });
    setSignatures(updated);
    if (onSignaturesUpdated) {
      onSignaturesUpdated(updated);
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#1b4332] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>डिजिटल हस्ताक्षर प्रबंधन (Official Signatures)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold uppercase">
                  Fixed &amp; Auto-Applied
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                प्रिंसिपल और एग्जाम कंट्रोलर के हस्ताक्षर अपलोड करें (सभी रिपोर्ट कार्ड व एडमिट कार्ड पर स्वतः लागू होंगे)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Info Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-900 flex items-start gap-2.5 shrink-0">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px] sm:text-xs">
            <strong>स्थायी नियम:</strong> एक बार हस्ताक्षर (JPG/PNG) अपलोड करके सेव करने के बाद यह सिस्टम में स्थायी रहेगा। 
            जब भी आप किसी भी क्लास का <strong>रिजल्ट (Report Card)</strong> या <strong>एडमिट कार्ड (Admit Card)</strong> जनरेट या डाउनलोड करेंगे, 
            वहां यही हस्ताक्षर स्वतः मुद्रित होंगे।
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Controller of Examinations Signature */}
            <div className="border-2 border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    1. एग्जाम कंट्रोलर के हस्ताक्षर
                  </span>
                  {controllerPreview ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      अपलोडेड ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      अन-सेट
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Controller of Examinations / Exam In-charge का डिजिटल साइन (JPG / PNG)
                </p>

                {/* Preview Box */}
                <div className="h-28 border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden group">
                  {controllerPreview ? (
                    <>
                      <img 
                        src={controllerPreview} 
                        alt="Controller Signature Preview" 
                        className="max-h-20 max-w-full object-contain filter contrast-125"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove('controller')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer"
                        title="हस्ताक्षर हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                      <span className="text-[11px] text-slate-400 font-medium block">
                        हस्ताक्षर की इमेज चुनें
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        (पारदर्शी/सफेद पृष्ठभूमि वाली JPG या PNG)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Trigger Button */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={controllerFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(e) => handleFileUpload(e, 'controller')}
                  className="hidden"
                  id="controller-file-input"
                />
                <label
                  htmlFor="controller-file-input"
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>{controllerPreview ? 'साइन बदलें (Replace)' : 'JPG/PNG साइन अपलोड करें'}</span>
                </label>
                {controllerPreview && (
                  <button
                    type="button"
                    onClick={() => handleRemove('controller')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                    title="हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Principal / Headmaster Signature */}
            <div className="border-2 border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    2. प्रधानाचार्य के हस्ताक्षर (Principal)
                  </span>
                  {principalPreview ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      अपलोडेड ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      अन-सेट
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Principal / Headmaster का आधिकारिक डिजिटल साइन (JPG / PNG)
                </p>

                {/* Preview Box */}
                <div className="h-28 border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden group">
                  {principalPreview ? (
                    <>
                      <img 
                        src={principalPreview} 
                        alt="Principal Signature Preview" 
                        className="max-h-20 max-w-full object-contain filter contrast-125"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove('principal')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer"
                        title="हस्ताक्षर हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                      <span className="text-[11px] text-slate-400 font-medium block">
                        हस्ताक्षर की इमेज चुनें
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        (पारदर्शी/सफेद पृष्ठभूमि वाली JPG या PNG)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Trigger Button */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={principalFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(e) => handleFileUpload(e, 'principal')}
                  className="hidden"
                  id="principal-file-input"
                />
                <label
                  htmlFor="principal-file-input"
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>{principalPreview ? 'साइन बदलें (Replace)' : 'JPG/PNG साइन अपलोड करें'}</span>
                </label>
                {principalPreview && (
                  <button
                    type="button"
                    onClick={() => handleRemove('principal')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                    title="हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Document Footer Preview */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>लाइव दस्तावेज़ पूर्वावलोकन (Live Footer Signatures Preview)</span>
            </h4>
            
            <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* 1. Class Teacher */}
                <div className="flex flex-col justify-end items-center">
                  <div className="h-12 w-full flex items-end justify-center pb-1 border-b border-dashed border-slate-400">
                    <span className="text-[11px] font-sans font-medium text-slate-400 italic">Signature</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 mt-1 uppercase">
                    Class Teacher
                  </span>
                </div>

                {/* 2. Controller */}
                <div className="flex flex-col justify-end items-center">
                  <div className="h-12 w-full flex items-end justify-center pb-1 border-b border-dashed border-slate-400 overflow-hidden">
                    {controllerPreview ? (
                      <img 
                        src={controllerPreview} 
                        alt="Controller Signature" 
                        className="max-h-10 max-w-[130px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-serif italic font-semibold text-[#1b4332] text-xs">P.I.S. Exam Cell</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 mt-1 uppercase">
                    Controller of Examination
                  </span>
                </div>

                {/* 3. Principal */}
                <div className="flex flex-col justify-end items-center">
                  <div className="h-12 w-full flex items-end justify-center pb-1 border-b border-dashed border-slate-400 overflow-hidden">
                    {principalPreview ? (
                      <img 
                        src={principalPreview} 
                        alt="Principal Signature" 
                        className="max-h-10 max-w-[130px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-serif italic font-semibold text-indigo-900 text-xs">Principal</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 mt-1 uppercase">
                    Principal / Headmaster
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            रद्द करें (Cancel)
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaved}
            className="px-6 py-2.5 bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>हस्ताक्षर सुरक्षित कर दिए गए! (Saved)</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-amber-300" />
                <span>सुरक्षित करें और सभी रिपोर्ट/एडमिट कार्ड पर लागू करें</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
