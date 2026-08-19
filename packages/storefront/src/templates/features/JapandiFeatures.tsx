interface FeaturesProps {
  features: Array<{ icon: string; title: string; description: string }> | null;
  t: (key: string) => string;
}

export default function JapandiFeatures({ features, t }: FeaturesProps) {
  const list = features?.length ? features : [
    { icon: '〇', title: t('features.fresh'), description: t('features.freshDesc') },
    { icon: '☰', title: t('features.tropical'), description: t('features.tropicalDesc') },
    { icon: '〜', title: t('features.fast'), description: t('features.fastDesc') },
  ];
  return (
    <section className="bg-white dark:bg-[#24211E] py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {list.map((f, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 mx-auto mb-6 rounded-full border border-[#D8CFC0] flex items-center justify-center text-[#A63D2E] text-xl">
                {f.icon}
              </div>
              <h3 className="text-base font-light tracking-[0.15em] uppercase text-[#2E2B28] dark:text-[#F7F5EE] mb-3" style={{ fontFamily: 'Georgia, serif' }}>{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-light max-w-xs mx-auto">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
