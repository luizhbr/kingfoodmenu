interface FeaturesProps {
  features: Array<{ icon: string; title: string; description: string }> | null;
  t: (key: string) => string;
}

export default function ArtDecoFeatures({ features, t }: FeaturesProps) {
  const list = features?.length ? features : [
    { icon: '◆', title: t('features.fresh'), description: t('features.freshDesc') },
    { icon: '▲', title: t('features.tropical'), description: t('features.tropicalDesc') },
    { icon: '●', title: t('features.fast'), description: t('features.fastDesc') },
  ];
  return (
    <section className="bg-[#F5EFE0] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {list.map((f, i) => (
            <div key={i} className="bg-white p-8 text-center border-t-2 border-b-2 border-[#C9A227] relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#C9A227] rotate-45" />
              <div className="w-12 h-12 mx-auto mb-5 border-2 border-[#C9A227] flex items-center justify-center text-[#7A1E1E] text-2xl">
                {f.icon}
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-[#111] mb-2" style={{ fontFamily: 'Georgia, serif' }}>{f.title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
