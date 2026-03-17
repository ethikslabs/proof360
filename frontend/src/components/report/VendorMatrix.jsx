import { useState } from 'react';

function VendorNode({ vendor, onSelect, selected }) {
  return (
    <button
      onClick={() => onSelect(vendor)}
      style={{ left: `${vendor.x * 100}%`, top: `${vendor.y * 100}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      title={vendor.display_name}
    >
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
        ${vendor.is_pick
          ? 'bg-gray-900 text-white ring-2 ring-offset-2 ring-gray-900 scale-110'
          : selected
            ? 'bg-gray-700 text-white scale-105'
            : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-gray-500'}
      `}>
        {vendor.initials}
      </div>
      {vendor.is_pick && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 whitespace-nowrap">
          our pick
        </span>
      )}
    </button>
  );
}

function PickCard({ pick, vendor }) {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">{pick.stage_context}</p>
          <p className="text-sm font-medium text-gray-900">{pick.recommendation_headline}</p>
        </div>
        {vendor?.deal_label && (
          <span className="text-[10px] bg-[#EAF3DE] text-[#3A7A3A] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2">
            {vendor.deal_label}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 leading-relaxed mb-3">{pick.recommendation_body}</p>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div><span className="text-gray-400">Time to close </span><span className="text-gray-700">{pick.meta.time_to_close}</span></div>
        <div><span className="text-gray-400">Covers </span><span className="text-gray-700">{pick.meta.covers}</span></div>
        <div className="col-span-2"><span className="text-gray-400">Best for </span><span className="text-gray-700">{pick.meta.best_for}</span></div>
      </div>
      {pick.referral_url ? (
        <a
          href={pick.referral_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {pick.cta_label} →
        </a>
      ) : (
        <button
          onClick={() => console.log('vendor_cta_click', pick.vendor_id)}
          className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {pick.cta_label} →
        </button>
      )}
    </div>
  );
}

export default function VendorMatrix({ vendorIntelligence }) {
  const { category_name, quadrant_axes, vendors, pick, disclosure } = vendorIntelligence;
  const [selected, setSelected] = useState(null);

  const pickVendor = vendors.find((v) => v.vendor_id === pick?.vendor_id);
  const displayVendor = selected || pickVendor;

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Supported paths</p>

      {/* Quadrant */}
      <div className="relative">
        {/* Axis labels */}
        <div className="flex justify-between text-[9px] text-gray-300 mb-1 px-4">
          <span>{quadrant_axes.x_left}</span>
          <span>{quadrant_axes.x_right}</span>
        </div>

        {/* Plot area */}
        <div className="relative h-36 border border-gray-100 rounded-lg bg-gray-50 overflow-visible mx-4">
          {/* Centre crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-full border-t border-dashed border-gray-200" />
            <div className="absolute h-full border-l border-dashed border-gray-200" />
          </div>

          {/* Y axis labels */}
          <span className="absolute -left-1 top-1 text-[9px] text-gray-300 -rotate-0">{quadrant_axes.y_top}</span>
          <span className="absolute -left-1 bottom-1 text-[9px] text-gray-300">{quadrant_axes.y_bottom}</span>

          {/* Vendor nodes */}
          {vendors.map((v) => (
            <VendorNode
              key={v.vendor_id}
              vendor={v}
              selected={selected?.vendor_id === v.vendor_id}
              onSelect={(v) => setSelected(selected?.vendor_id === v.vendor_id ? null : v)}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 px-4">
          {vendors.map((v) => (
            <button
              key={v.vendor_id}
              onClick={() => setSelected(selected?.vendor_id === v.vendor_id ? null : v)}
              className={`flex items-center gap-1.5 text-[10px] transition-opacity ${
                selected && selected.vendor_id !== v.vendor_id ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${v.is_pick ? 'bg-gray-900' : 'bg-gray-300'}`} />
              <span className="text-gray-600">{v.display_name}</span>
              {v.is_partner && <span className="text-gray-400">·</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Pick / selected vendor card */}
      {pick && displayVendor && (
        <PickCard
          pick={selected ? {
            ...pick,
            vendor_id: selected.vendor_id,
            recommendation_headline: selected.display_name,
            recommendation_body: selected.summary,
            meta: { ...pick.meta, best_for: selected.best_for },
            cta_label: `Start with ${selected.display_name}`,
            deal_label: selected.deal_label,
            referral_url: selected.referral_url,
          } : pick}
          vendor={displayVendor}
        />
      )}

      {disclosure && (
        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">{disclosure}</p>
      )}
    </div>
  );
}
