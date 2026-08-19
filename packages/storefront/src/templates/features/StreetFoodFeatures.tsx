interface FeaturesProps {
  features: Array<{ icon: string; title: string; description: string }> | null;
  t: (key: string) => string;
}

export default function StreetFoodFeatures({ features, t }: FeaturesProps) {
  const list = features?.length ? features : [
    { icon: '🔥', title: t('features.fresh'), description: t('features.freshDesc') },
    { icon: '💨', title: t('features.tropical'), description: t('features.tropicalDesc') },
    { icon: '⚡', title: t('features.fast'), description: t('features.fastDesc') },
  ];
  return (
    <section className="bg-[#F5F5F0] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {list.map((f, i) => (
            <div key={i} className="bg-white p-8 border-l-4 border-[#FF2E2E] shadow-sm hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-5">{f.icon}</div>
              <h3 className="text-xl font-black uppercase tracking-wide text-[#1A1A1A] mb-2">{f.title}</h3>
              <p className="text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
