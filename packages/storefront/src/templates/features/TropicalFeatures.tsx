interface FeaturesProps {
  features: Array<{ icon: string; title: string; description: string }> | null;
  t: (key: string) => string;
}

export default function TropicalFeatures({ features, t }: FeaturesProps) {
  const list = features?.length ? features : [
    { icon: '🥥', title: t('features.fresh'), description: t('features.freshDesc') },
    { icon: '🌴', title: t('features.tropical'), description: t('features.tropicalDesc') },
    { icon: '⚡', title: t('features.fast'), description: t('features.fastDesc') },
  ];
  return (
    <section className="bg-[#FFF8E7] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {list.map((f, i) => (
            <div key={i} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow border-t-4 border-[#FFD166]">
              <div className="w-14 h-14 rounded-full bg-[#0B6E4F]/10 flex items-center justify-center text-3xl mb-5">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-[#0B4F3E] mb-2" style={{ fontFamily: 'Georgia, serif' }}>{f.title}</h3>
              <p className="text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
