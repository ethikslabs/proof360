import { useState } from 'react';

export default function VendorChip({ vendor }) {
  const [tooltip, setTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => { setTooltip(!tooltip); console.log('vendor_click', vendor.vendor_id); }}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
          vendor.is_pick
            ? 'bg-[#EAF3DE] border-[#3A7A3A] text-[#3A7A3A] font-medium'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-gray-200 text-[9px] font-bold flex items-center justify-center text-gray-600">
          {vendor.initials}
        </span>
        {vendor.display_name}
        {vendor.is_pick && <span className="text-[9px] uppercase tracking-wide text-[#3A7A3A]">pick</span>}
      </button>
      {tooltip && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-gray-900 text-white text-xs rounded px-2.5 py-1.5 z-10">
          Learn more about {vendor.display_name} — full details coming soon.
        </div>
      )}
    </div>
  );
}
